import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * File System Utilities for Analysis System
 * Provides safe file operations, workspace management, and file analysis utilities
 */

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  relativePath: string;
  language: string;
  encoding?: string;
}

export interface DirectoryInfo {
  path: string;
  name: string;
  fileCount: number;
  directoryCount: number;
  totalSize: number;
  files: FileInfo[];
  subdirectories: DirectoryInfo[];
}

export interface FileSearchOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFileSize?: number;
  maxDepth?: number;
  followSymlinks?: boolean;
  includeHidden?: boolean;
  extensions?: string[];
}

export interface FileWatcherOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  debounceDelay?: number;
  recursive?: boolean;
}

export interface WorkspaceAnalysis {
  totalFiles: number;
  totalSize: number;
  languageDistribution: { [language: string]: number };
  largestFiles: FileInfo[];
  recentlyModified: FileInfo[];
  duplicateFiles: Array<{ hash: string; files: FileInfo[] }>;
  emptyFiles: FileInfo[];
  binaryFiles: FileInfo[];
}

export class FileSystemUtils {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly TEXT_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.go', '.java',
    '.cs', '.php', '.rb', '.rs', '.swift', '.kt', '.scala',
    '.html', '.css', '.scss', '.sass', '.less', '.xml', '.json',
    '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.md',
    '.txt', '.log', '.sql', '.sh', '.bat', '.ps1', '.dockerfile'
  ]);

  /**
   * Check if a file exists and is accessible
   */
  public static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a path is a directory
   */
  public static async isDirectory(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get detailed file information
   */
  public static async getFileInfo(
    filePath: string,
    workspacePath?: string
  ): Promise<FileInfo | null> {
    try {
      const stats = await fs.promises.stat(filePath);
      const name = path.basename(filePath);
      const extension = path.extname(filePath).toLowerCase();
      const relativePath = workspacePath 
        ? path.relative(workspacePath, filePath)
        : filePath;

      return {
        path: filePath,
        name,
        extension,
        size: stats.size,
        lastModified: stats.mtime,
        isDirectory: stats.isDirectory(),
        relativePath,
        language: this.getLanguageFromExtension(extension),
        encoding: await this.detectEncoding(filePath)
      };
    } catch (error) {
      console.warn(`Failed to get file info for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Read file content safely with encoding detection
   */
  public static async readFileContent(
    filePath: string,
    maxSize: number = this.MAX_FILE_SIZE
  ): Promise<{ content: string; encoding: string; isBinary: boolean } | null> {
    try {
      const stats = await fs.promises.stat(filePath);
      
      if (stats.size > maxSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
      }

      const buffer = await fs.promises.readFile(filePath);
      const encoding = this.detectEncodingFromBuffer(buffer);
      const isBinary = this.isBinaryFile(buffer, path.extname(filePath));

      if (isBinary) {
        return {
          content: `[Binary file: ${stats.size} bytes]`,
          encoding,
          isBinary: true
        };
      }

      const content = buffer.toString(encoding as BufferEncoding);
      
      return {
        content,
        encoding,
        isBinary: false
      };
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Write file content safely with backup
   */
  public static async writeFileContent(
    filePath: string,
    content: string,
    options: {
      encoding?: BufferEncoding;
      createBackup?: boolean;
      ensureDirectory?: boolean;
    } = {}
  ): Promise<boolean> {
    const { encoding = 'utf8', createBackup = true, ensureDirectory = true } = options;

    try {
      // Ensure directory exists
      if (ensureDirectory) {
        const directory = path.dirname(filePath);
        await this.ensureDirectory(directory);
      }

      // Create backup if file exists
      if (createBackup && await this.fileExists(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.promises.copyFile(filePath, backupPath);
      }

      // Write file
      await fs.promises.writeFile(filePath, content, { encoding });
      return true;
    } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  public static async ensureDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}:`, error);
      return false;
    }
  }

  /**
   * Find files matching patterns
   */
  public static async findFiles(
    searchPath: string,
    options: FileSearchOptions = {}
  ): Promise<FileInfo[]> {
    const {
      includePatterns = ['**/*'],
      excludePatterns = ['**/node_modules/**', '**/.git/**'],
      maxFileSize = this.MAX_FILE_SIZE,
      maxDepth = 10,
      followSymlinks = false,
      includeHidden = false,
      extensions
    } = options;

    const files: FileInfo[] = [];

    async function searchDirectory(dirPath: string, currentDepth: number = 0): Promise<void> {
      if (currentDepth > maxDepth) return;

      try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(searchPath, fullPath);

          // Skip hidden files if not included
          if (!includeHidden && entry.name.startsWith('.')) {
            continue;
          }

          // Check exclude patterns
          if (FileSystemUtils.matchesPatterns(relativePath, excludePatterns)) {
            continue;
          }

          if (entry.isDirectory()) {
            await searchDirectory(fullPath, currentDepth + 1);
          } else if (entry.isFile() || (entry.isSymbolicLink() && followSymlinks)) {
            // Check include patterns
            if (!FileSystemUtils.matchesPatterns(relativePath, includePatterns)) {
              continue;
            }

            // Check file extension
            const extension = path.extname(entry.name).toLowerCase();
            if (extensions && !extensions.includes(extension)) {
              continue;
            }

            const fileInfo = await FileSystemUtils.getFileInfo(fullPath, searchPath);
            if (fileInfo && fileInfo.size <= maxFileSize) {
              files.push(fileInfo);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to search directory ${dirPath}:`, error);
      }
    }

    await searchDirectory(searchPath);
    return files;
  }

  /**
   * Analyze workspace for file statistics
   */
  public static async analyzeWorkspace(workspacePath: string): Promise<WorkspaceAnalysis> {
    const files = await this.findFiles(workspacePath, {
      includePatterns: ['**/*'],
      excludePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**'
      ]
    });

    const languageDistribution: { [language: string]: number } = {};
    const fileHashes = new Map<string, FileInfo[]>();
    const emptyFiles: FileInfo[] = [];
    const binaryFiles: FileInfo[] = [];
    let totalSize = 0;

    // Process each file
    for (const file of files) {
      totalSize += file.size;

      // Language distribution
      languageDistribution[file.language] = (languageDistribution[file.language] || 0) + 1;

      // Empty files
      if (file.size === 0) {
        emptyFiles.push(file);
      }

      // Binary files
      if (!this.isTextFile(file.extension)) {
        binaryFiles.push(file);
        continue;
      }

      // Calculate file hash for duplicate detection
      try {
        const content = await fs.promises.readFile(file.path);
        const hash = crypto.createHash('md5').update(content).digest('hex');
        
        if (!fileHashes.has(hash)) {
          fileHashes.set(hash, []);
        }
        fileHashes.get(hash)!.push(file);
      } catch (error) {
        console.warn(`Failed to hash file ${file.path}:`, error);
      }
    }

    // Find duplicates
    const duplicateFiles = Array.from(fileHashes.entries())
      .filter(([, files]) => files.length > 1)
      .map(([hash, files]) => ({ hash, files }));

    // Sort files by size and modification time
    const largestFiles = [...files]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    const recentlyModified = [...files]
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 10);

    return {
      totalFiles: files.length,
      totalSize,
      languageDistribution,
      largestFiles,
      recentlyModified,
      duplicateFiles,
      emptyFiles,
      binaryFiles
    };
  }

  /**
   * Create file watcher for real-time monitoring
   */
  public static createFileWatcher(
    watchPath: string,
    options: FileWatcherOptions = {}
  ): vscode.FileSystemWatcher {
    const {
      includePatterns = ['**/*'],
      excludePatterns = ['**/node_modules/**', '**/.git/**'],
      debounceDelay = 500,
      recursive = true
    } = options;

    // Create VS Code file watcher
    const pattern = new vscode.RelativePattern(watchPath, includePatterns[0]);
    const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);

    // Debounce file change events
    const debouncedHandlers = new Map<string, NodeJS.Timeout>();

    const createDebouncedHandler = (handler: (uri: vscode.Uri) => void) => {
      return (uri: vscode.Uri) => {
        const relativePath = path.relative(watchPath, uri.fsPath);
        
        // Check exclude patterns
        if (this.matchesPatterns(relativePath, excludePatterns)) {
          return;
        }

        // Clear existing timeout
        const existingTimeout = debouncedHandlers.get(uri.fsPath);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
          handler(uri);
          debouncedHandlers.delete(uri.fsPath);
        }, debounceDelay);

        debouncedHandlers.set(uri.fsPath, timeout);
      };
    };

    return watcher;
  }

  /**
   * Get workspace folders with analysis
   */
  public static getWorkspaceFolders(): Array<{
    uri: vscode.Uri;
    name: string;
    index: number;
    isAnalyzable: boolean;
    fileCount?: number;
  }> {
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    
    return workspaceFolders.map((folder, index) => ({
      uri: folder.uri,
      name: folder.name,
      index,
      isAnalyzable: this.isAnalyzableWorkspace(folder.uri.fsPath)
    }));
  }

  /**
   * Check if workspace is suitable for analysis
   */
  public static isAnalyzableWorkspace(workspacePath: string): boolean {
    // Check for common project indicators
    const indicators = [
      'package.json',
      'tsconfig.json',
      'pyproject.toml',
      'requirements.txt',
      'go.mod',
      'pom.xml',
      'build.gradle',
      'Cargo.toml',
      '.gitignore'
    ];

    return indicators.some(indicator => 
      fs.existsSync(path.join(workspacePath, indicator))
    );
  }

  /**
   * Generate temporary file path
   */
  public static generateTempFilePath(
    prefix: string = 'cxg',
    extension: string = '.tmp'
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${prefix}_${timestamp}_${random}${extension}`;
    
    return path.join(this.getTempDirectory(), fileName);
  }

  /**
   * Get system temporary directory
   */
  public static getTempDirectory(): string {
    return process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
  }

  /**
   * Clean up old temporary files
   */
  public static async cleanupTempFiles(
    prefix: string = 'cxg',
    maxAge: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Promise<number> {
    const tempDir = this.getTempDirectory();
    let cleanedCount = 0;

    try {
      const files = await fs.promises.readdir(tempDir);
      const now = Date.now();

      for (const file of files) {
        if (file.startsWith(prefix)) {
          const filePath = path.join(tempDir, file);
          try {
            const stats = await fs.promises.stat(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
              await fs.promises.unlink(filePath);
              cleanedCount++;
            }
          } catch (error) {
            // File might have been deleted already
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup temp files:', error);
    }

    return cleanedCount;
  }

  /**
   * Calculate directory size recursively
   */
  public static async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    async function calculateSize(currentPath: string): Promise<void> {
      try {
        const stats = await fs.promises.stat(currentPath);
        
        if (stats.isDirectory()) {
          const entries = await fs.promises.readdir(currentPath);
          for (const entry of entries) {
            await calculateSize(path.join(currentPath, entry));
          }
        } else {
          totalSize += stats.size;
        }
      } catch (error) {
        // Skip inaccessible files/directories
      }
    }

    await calculateSize(dirPath);
    return totalSize;
  }

  /**
   * Copy file with progress callback
   */
  public static async copyFile(
    sourcePath: string,
    targetPath: string,
    progressCallback?: (bytesWritten: number, totalBytes: number) => void
  ): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(sourcePath);
      const totalBytes = stats.size;
      let bytesWritten = 0;

      // Ensure target directory exists
      await this.ensureDirectory(path.dirname(targetPath));

      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(targetPath);

      return new Promise((resolve, reject) => {
        readStream.on('data', (chunk) => {
          bytesWritten += chunk.length;
          if (progressCallback) {
            progressCallback(bytesWritten, totalBytes);
          }
        });

        readStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', () => resolve(true));

        readStream.pipe(writeStream);
      });
    } catch (error) {
      console.error(`Failed to copy file ${sourcePath} to ${targetPath}:`, error);
      return false;
    }
  }

  /**
   * Get file hash (MD5)
   */
  public static async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      console.warn(`Failed to hash file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if file has been modified since timestamp
   */
  public static async isFileModifiedSince(
    filePath: string,
    timestamp: Date
  ): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.mtime > timestamp;
    } catch {
      return false;
    }
  }

  // Helper methods

  /**
   * Check if patterns match a file path
   */
  public static matchesPatterns(filePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Simple glob pattern matching (could be enhanced with proper glob library)
      const regex = new RegExp(
        pattern
          .replace(/\./g, '\\.')
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '[^/]')
      );
      return regex.test(filePath);
    });
  }

  /**
   * Get language from file extension
   */
  public static getLanguageFromExtension(extension: string): string {
    const languageMap: { [ext: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.vue': 'vue',
      '.py': 'python',
      '.go': 'go',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.xml': 'xml',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.sql': 'sql',
      '.sh': 'shellscript',
      '.bat': 'bat',
      '.ps1': 'powershell'
    };

    return languageMap[extension.toLowerCase()] || 'plaintext';
  }

  /**
   * Check if file is a text file based on extension
   */
  public static isTextFile(extension: string): boolean {
    return this.TEXT_EXTENSIONS.has(extension.toLowerCase());
  }

  /**
   * Detect file encoding from buffer
   */
  private static detectEncodingFromBuffer(buffer: Buffer): string {
    // Simple encoding detection
    if (buffer.length === 0) return 'utf8';

    // Check for BOM
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf8';
    }

    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'utf16le';
    }

    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'utf16be';
    }

    // Check for null bytes (binary indicator)
    const nullCount = buffer.filter(byte => byte === 0).length;
    if (nullCount > buffer.length * 0.01) {
      return 'binary';
    }

    // Default to UTF-8
    return 'utf8';
  }

  /**
   * Detect file encoding asynchronously
   */
  private static async detectEncoding(filePath: string): Promise<string> {
    try {
      const buffer = await fs.promises.readFile(filePath, { encoding: null });
      return this.detectEncodingFromBuffer(buffer as Buffer);
    } catch {
      return 'utf8';
    }
  }

  /**
   * Check if file is binary
   */
  private static isBinaryFile(buffer: Buffer, extension: string): boolean {
    // Check by extension first
    if (!this.isTextFile(extension)) {
      return true;
    }

    // Check for null bytes in first 1KB
    const sampleSize = Math.min(buffer.length, 1024);
    const sample = buffer.slice(0, sampleSize);
    
    let nullCount = 0;
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) {
        nullCount++;
      }
    }

    // If more than 1% null bytes, consider binary
    return nullCount > sampleSize * 0.01;
  }
}

/**
 * File System Watcher for real-time updates
 */
export class FileSystemWatcher {
  private watcher?: vscode.FileSystemWatcher;
  private _onFileCreated = new vscode.EventEmitter<FileInfo>();
  private _onFileChanged = new vscode.EventEmitter<FileInfo>();
  private _onFileDeleted = new vscode.EventEmitter<string>();
  private _onDirectoryCreated = new vscode.EventEmitter<string>();
  private _onDirectoryDeleted = new vscode.EventEmitter<string>();

  public readonly onFileCreated = this._onFileCreated.event;
  public readonly onFileChanged = this._onFileChanged.event;
  public readonly onFileDeleted = this._onFileDeleted.event;
  public readonly onDirectoryCreated = this._onDirectoryCreated.event;
  public readonly onDirectoryDeleted = this._onDirectoryDeleted.event;

  constructor(
    private watchPath: string,
    private options: FileWatcherOptions = {}
  ) {}

  /**
   * Start watching for file system changes
   */
  public start(): void {
    if (this.watcher) {
      this.stop();
    }

    this.watcher = FileSystemUtils.createFileWatcher(this.watchPath, this.options);

    this.watcher.onDidCreate(async (uri) => {
      const info = await FileSystemUtils.getFileInfo(uri.fsPath, this.watchPath);
      if (!info) return;
      if (info.isDirectory) {
        this._onDirectoryCreated.fire(uri.fsPath);
      } else {
        this._onFileCreated.fire(info);
      }
    });

    this.watcher.onDidChange(async (uri) => {
      const info = await FileSystemUtils.getFileInfo(uri.fsPath, this.watchPath);
      if (info && !info.isDirectory) {
        this._onFileChanged.fire(info);
      }
    });

    this.watcher.onDidDelete((uri) => {
      this._onFileDeleted.fire(uri.fsPath);
      this._onDirectoryDeleted.fire(uri.fsPath);
    });
  }

  /** 
   * Stop watching for file system changes
  */
  public stop(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = undefined;
    }
  }

  /** 
   * Dispose all emitters and the underlying watcher
   */
  public dispose(): void {
    this.stop();
    this._onFileCreated.dispose();
    this._onFileChanged.dispose();
    this._onFileDeleted.dispose();
    this._onDirectoryCreated.dispose();
    this._onDirectoryDeleted.dispose();
  }
}

/**
 * File System Utilities for specific analysis tasks
 */
export class AnalysisFileUtils {
  /**
   * Find configuration files in workspace
   */
  public static async findConfigFiles(workspacePath: string): Promise<FileInfo[]> {
    const configPatterns = [
      '**/*.config.js',
      '**/*.config.ts',
      '**/package.json',
      '**/tsconfig.json',
      '**/.eslintrc.*',
      '**/.prettierrc.*',
      '**/webpack.config.*',
      '**/babel.config.*',
      '**/jest.config.*',
      '**/.env*',
      '**/docker-compose.yml'
    ];

    return FileSystemUtils.findFiles(workspacePath, {
      includePatterns: configPatterns,
      excludePatterns: ['**/node_modules/**', '**/.git/**']
    });
  }

  /**
   * Find test files in workspace
   */
  public static async findTestFiles(workspacePath: string): Promise<FileInfo[]> {
    const testPatterns = [
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.spec.js',
      '**/*.spec.ts',
      '**/__tests__/**/*',
      '**/test/**/*',
      '**/tests/**/*'
    ];

    return FileSystemUtils.findFiles(workspacePath, {
      includePatterns: testPatterns,
      excludePatterns: ['**/node_modules/**']
    });
  }

  /**
   * Find source code files for analysis
   */
  public static async findSourceFiles(
    workspacePath: string,
    languages?: string[]
  ): Promise<FileInfo[]> {
    const sourceExtensions = languages 
      ? languages.flatMap(lang => this.getExtensionsForLanguage(lang))
      : ['.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.go', '.java', '.cs', '.php', '.rb'];

    return FileSystemUtils.findFiles(workspacePath, {
      includePatterns: ['**/*'],
      excludePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/*.min.js',
        '**/*.map'
      ],
      extensions: sourceExtensions
    });
  }

  /**
   * Get file extensions for a programming language
   */
  private static getExtensionsForLanguage(language: string): string[] {
    const extensionMap: { [lang: string]: string[] } = {
      javascript: ['.js', '.jsx'],
      typescript: ['.ts', '.tsx'],
      python: ['.py', '.pyw'],
      go: ['.go'],
      java: ['.java'],
      csharp: ['.cs'],
      php: ['.php'],
      ruby: ['.rb'],
      rust: ['.rs'],
      swift: ['.swift'],
      kotlin: ['.kt'],
      scala: ['.scala']
    };

    return extensionMap[language.toLowerCase()] || [];
  }

  /**
   * Create analysis report directory structure
   */
  public static async createReportDirectory(basePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(basePath, 'cxg-reports', `report-${timestamp}`);

    await FileSystemUtils.ensureDirectory(reportDir);
    await FileSystemUtils.ensureDirectory(path.join(reportDir, 'analysis'));
    await FileSystemUtils.ensureDirectory(path.join(reportDir, 'assets'));
    await FileSystemUtils.ensureDirectory(path.join(reportDir, 'data'));

    return reportDir;
  }

  /**
   * Get project metadata from common files
   */
  public static async getProjectMetadata(workspacePath: string): Promise<{
    name?: string;
    version?: string;
    language?: string;
    framework?: string;
    dependencies?: string[];
  }> {
    const metadata: any = {};

    // Check package.json
    const packageJsonPath = path.join(workspacePath, 'package.json');
    if (await FileSystemUtils.fileExists(packageJsonPath)) {
      try {
        const content = await fs.promises.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(content);
        metadata.name = packageJson.name;
        metadata.version = packageJson.version;
        metadata.language = 'javascript';
        metadata.dependencies = Object.keys({
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        });
      } catch (error) {
        console.warn('Failed to parse package.json:', error);
      }
    }

    // Check other language-specific files
    const languageFiles = [
      { file: 'pyproject.toml', language: 'python' },
      { file: 'requirements.txt', language: 'python' },
      { file: 'go.mod', language: 'go' },
      { file: 'pom.xml', language: 'java' },
      { file: 'build.gradle', language: 'java' },
      { file: 'Cargo.toml', language: 'rust' }
    ];

    for (const { file, language } of languageFiles) {
      if (await FileSystemUtils.fileExists(path.join(workspacePath, file))) {
        metadata.language = language;
        break;
      }
    }

    return metadata;
  }
}

/**
 * File operation queue for batch processing
 */
export class FileOperationQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private concurrency = 3;

  constructor(concurrency: number = 3) {
    this.concurrency = concurrency;
  }

  /**
   * Add file operation to queue
   */
  public add(operation: () => Promise<void>): void {
    this.queue.push(operation);
    this.processQueue();
  }

  /**
   * Process queued operations
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    const activeOperations: Promise<void>[] = [];

    while (this.queue.length > 0 || activeOperations.length > 0) {
      // Start new operations up to concurrency limit
      while (activeOperations.length < this.concurrency && this.queue.length > 0) {
        const operation = this.queue.shift()!;
        const promise = operation().catch(error => {
          console.error('File operation failed:', error);
        });
        activeOperations.push(promise);
      }

      // Wait for at least one operation to complete
      if (activeOperations.length > 0) {
        await Promise.race(activeOperations);
        
        // Remove completed operations
        for (let i = activeOperations.length - 1; i >= 0; i--) {
          const operation = activeOperations[i];
          if (await Promise.race([operation, Promise.resolve('pending')]) !== 'pending') {
            activeOperations.splice(i, 1);
          }
        }
      }
    }

    this.processing = false;
  }

  /**
   * Wait for all operations to complete
   */
  public async waitForCompletion(): Promise<void> {
    while (this.processing || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Clear queue
   */
  public clear(): void {
    this.queue.length = 0;
  }
}