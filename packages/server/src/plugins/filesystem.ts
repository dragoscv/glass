import { promises as fs, constants } from 'fs';
import { join, dirname, basename } from 'path';
import type { 
  PluginInterface, 
  FileReadRequest, 
  FileWriteRequest, 
  FileInfo, 
  DirectoryListRequest, 
  FileSystemOperation 
} from '@glassmcp/shared';

export class FilesystemPlugin implements PluginInterface {
  public readonly name = 'filesystem';
  public readonly version = '1.0.0';

  async initialize(): Promise<void> {
    // Plugin initialization logic
  }

  async destroy(): Promise<void> {
    // Plugin cleanup logic
  }

  isSupported(): boolean {
    return true; // Filesystem operations are supported on all platforms
  }

  getCapabilities(): string[] {
    return [
      'read_file',
      'write_file',
      'list_directory',
      'create_directory',
      'delete_file',
      'delete_directory',
      'copy_file',
      'move_file',
      'get_file_info',
    ];
  }

  async readFile(request: FileReadRequest): Promise<string> {
    const { path, encoding = 'utf8', maxSize } = request;
    
    try {
      // Check file size if maxSize is specified
      if (maxSize) {
        const stats = await fs.stat(path);
        if (stats.size > maxSize) {
          throw new Error(`File size ${stats.size} exceeds maximum allowed size ${maxSize}`);
        }
      }
      
      let content: string;
      
      switch (encoding) {
        case 'utf8':
          content = await fs.readFile(path, 'utf8');
          break;
        case 'binary':
          const buffer = await fs.readFile(path);
          content = buffer.toString('binary');
          break;
        case 'base64':
          const base64Buffer = await fs.readFile(path);
          content = base64Buffer.toString('base64');
          break;
        default:
          throw new Error(`Unsupported encoding: ${encoding}`);
      }
      
      return content;
    } catch (error: any) {
      throw new Error(`Failed to read file ${path}: ${error.message}`);
    }
  }

  async writeFile(request: FileWriteRequest): Promise<void> {
    const { path, content, encoding = 'utf8', createDirectories = false } = request;
    
    try {
      // Create directories if requested
      if (createDirectories) {
        await fs.mkdir(dirname(path), { recursive: true });
      }
      
      switch (encoding) {
        case 'utf8':
          await fs.writeFile(path, content, 'utf8');
          break;
        case 'binary':
          await fs.writeFile(path, content, 'binary');
          break;
        case 'base64':
          const buffer = Buffer.from(content, 'base64');
          await fs.writeFile(path, buffer);
          break;
        default:
          throw new Error(`Unsupported encoding: ${encoding}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to write file ${path}: ${error.message}`);
    }
  }

  async listDirectory(request: DirectoryListRequest): Promise<FileInfo[]> {
    const { path, recursive = false, includeHidden = false, filter } = request;
    
    try {
      const entries = await fs.readdir(path, { withFileTypes: true });
      const results: FileInfo[] = [];
      
      for (const entry of entries) {
        const fullPath = join(path, entry.name);
        
        // Skip hidden files unless requested
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }
        
        // Apply filter if provided (simple glob-like matching)
        if (filter && !this.matchesFilter(entry.name, filter)) {
          continue;
        }
        
        const stats = await fs.stat(fullPath);
        const fileInfo: FileInfo = {
          path: fullPath,
          name: entry.name,
          size: stats.size,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          accessed: stats.atime.toISOString(),
          permissions: {
            readable: await this.checkAccess(fullPath, constants.R_OK),
            writable: await this.checkAccess(fullPath, constants.W_OK),
            executable: await this.checkAccess(fullPath, constants.X_OK),
          },
        };
        
        results.push(fileInfo);
        
        // Recursively list subdirectories
        if (recursive && entry.isDirectory()) {
          try {
            const subResults = await this.listDirectory({
              path: fullPath,
              recursive: true,
              includeHidden,
              filter,
            });
            results.push(...subResults);
          } catch (error) {
            // Skip directories we can't access
            console.warn(`Skipping inaccessible directory: ${fullPath}`);
          }
        }
      }
      
      return results;
    } catch (error: any) {
      throw new Error(`Failed to list directory ${path}: ${error.message}`);
    }
  }

  private async checkAccess(path: string, mode: number): Promise<boolean> {
    try {
      await fs.access(path, mode);
      return true;
    } catch {
      return false;
    }
  }

  private matchesFilter(filename: string, filter: string): boolean {
    // Simple glob-like matching (supports * and ?)
    const regexPattern = filter
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filename);
  }

  async getFileInfo(path: string): Promise<FileInfo> {
    try {
      const stats = await fs.stat(path);
      
      return {
        path,
        name: basename(path),
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
        permissions: {
          readable: await this.checkAccess(path, constants.R_OK),
          writable: await this.checkAccess(path, constants.W_OK),
          executable: await this.checkAccess(path, constants.X_OK),
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to get file info for ${path}: ${error.message}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch (error: any) {
      throw new Error(`Failed to delete file ${path}: ${error.message}`);
    }
  }

  async deleteDirectory(path: string, recursive = false): Promise<void> {
    try {
      if (recursive) {
        await fs.rm(path, { recursive: true, force: true });
      } else {
        await fs.rmdir(path);
      }
    } catch (error: any) {
      throw new Error(`Failed to delete directory ${path}: ${error.message}`);
    }
  }

  async createDirectory(path: string, recursive = true): Promise<void> {
    try {
      await fs.mkdir(path, { recursive });
    } catch (error: any) {
      throw new Error(`Failed to create directory ${path}: ${error.message}`);
    }
  }

  async copyFile(source: string, destination: string): Promise<void> {
    try {
      // Create destination directory if it doesn't exist
      await fs.mkdir(dirname(destination), { recursive: true });
      await fs.copyFile(source, destination);
    } catch (error: any) {
      throw new Error(`Failed to copy file from ${source} to ${destination}: ${error.message}`);
    }
  }

  async moveFile(source: string, destination: string): Promise<void> {
    try {
      // Create destination directory if it doesn't exist
      await fs.mkdir(dirname(destination), { recursive: true });
      await fs.rename(source, destination);
    } catch (error: any) {
      throw new Error(`Failed to move file from ${source} to ${destination}: ${error.message}`);
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async executeOperation(operation: FileSystemOperation): Promise<any> {
    const { type, path, content, destination, options = {} } = operation;
    
    switch (type) {
      case 'read':
        return await this.readFile({
          path,
          encoding: options.encoding as any || 'utf8',
        });
        
      case 'write':
        if (!content) throw new Error('Content is required for write operation');
        await this.writeFile({
          path,
          content,
          encoding: options.encoding as any || 'utf8',
          createDirectories: options.recursive || false,
        });
        break;
        
      case 'delete':
        const stats = await fs.stat(path);
        if (stats.isDirectory()) {
          await this.deleteDirectory(path, options.recursive || false);
        } else {
          await this.deleteFile(path);
        }
        break;
        
      case 'copy':
        if (!destination) throw new Error('Destination is required for copy operation');
        await this.copyFile(path, destination);
        break;
        
      case 'move':
        if (!destination) throw new Error('Destination is required for move operation');
        await this.moveFile(path, destination);
        break;
        
      case 'list':        return await this.listDirectory({
          path,
          recursive: options.recursive || false,
          includeHidden: false,
        });
        
      default:
        throw new Error(`Unsupported file system operation: ${type}`);
    }
  }
}
