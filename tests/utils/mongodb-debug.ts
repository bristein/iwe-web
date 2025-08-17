#!/usr/bin/env node

import { getGlobalTestServer } from './mongodb-test-server';
import { TestDataSeeder } from './test-data-factory';
import { DatabaseReset } from './db-reset';
import * as readline from 'readline';

/**
 * MongoDB Test Server Debug CLI
 *
 * Usage:
 *   npx ts-node tests/utils/mongodb-debug.ts
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'mongodb-test> ',
});

class MongoDBDebugCLI {
  private testServer = getGlobalTestServer({ enableLogging: true });

  async start() {
    console.log('🚀 MongoDB Test Server Debug CLI');
    console.log('Type "help" for available commands\n');

    await this.ensureServerRunning();

    rl.prompt();

    rl.on('line', async (line) => {
      const [command, ...args] = line.trim().split(' ');

      try {
        await this.handleCommand(command, args);
      } catch (error) {
        console.error('❌ Error:', error);
      }

      rl.prompt();
    });

    rl.on('close', async () => {
      console.log('\n👋 Shutting down...');
      await this.testServer.stop();
      process.exit(0);
    });
  }

  async ensureServerRunning() {
    if (!this.testServer.isRunning()) {
      console.log('🏁 Starting MongoDB test server...');
      const uri = await this.testServer.start();
      console.log(`✅ Server running at: ${uri}\n`);
    }
  }

  async handleCommand(command: string, args: string[]) {
    switch (command) {
      case 'help':
        this.showHelp();
        break;

      case 'status':
        await this.showStatus();
        break;

      case 'stats':
        await this.showStats();
        break;

      case 'list':
        await this.listCollections();
        break;

      case 'show':
        await this.showCollection(args[0]);
        break;

      case 'clear':
        await this.clearDatabase();
        break;

      case 'drop':
        await this.dropDatabase();
        break;

      case 'seed':
        await this.seedData(args[0]);
        break;

      case 'reset':
        await this.resetDatabase();
        break;

      case 'uri':
        this.showUri();
        break;

      case 'indexes':
        await this.createIndexes();
        break;

      case 'find':
        await this.findDocuments(args[0], args.slice(1).join(' '));
        break;

      case 'count':
        await this.countDocuments(args[0]);
        break;

      case 'export':
        await this.exportData(args[0]);
        break;

      case 'import':
        await this.importData(args[0]);
        break;

      case 'quit':
      case 'exit':
        rl.close();
        break;

      default:
        if (command) {
          console.log(`Unknown command: ${command}`);
          console.log('Type "help" for available commands');
        }
    }
  }

  showHelp() {
    console.log(`
📚 Available Commands:

  Database Operations:
    status          - Show server status
    stats           - Show database statistics
    list            - List all collections
    show <name>     - Show documents in collection
    clear           - Clear all data
    drop            - Drop entire database
    reset           - Reset to clean state
    indexes         - Create indexes
    
  Data Operations:
    seed [type]     - Seed test data (basic/performance)
    find <col> <q>  - Find documents matching query
    count <col>     - Count documents in collection
    export [file]   - Export database to JSON
    import <file>   - Import database from JSON
    
  Utilities:
    uri             - Show connection URI
    help            - Show this help
    quit/exit       - Exit CLI
    
  Examples:
    show users
    find users email:test@example.com
    seed basic
    export backup.json
`);
  }

  async showStatus() {
    const isRunning = this.testServer.isRunning();
    console.log(`\n📊 Server Status: ${isRunning ? '✅ Running' : '❌ Stopped'}`);

    if (isRunning) {
      console.log(`   URI: ${this.testServer.getUri()}`);
      const stats = await this.testServer.getStats();
      const totalDocs = Object.values(stats).reduce((sum, count) => sum + count, 0);
      console.log(`   Collections: ${Object.keys(stats).length}`);
      console.log(`   Total Documents: ${totalDocs}`);
    }
  }

  async showStats() {
    const stats = await this.testServer.getStats();
    console.log('\n📊 Database Statistics:');

    if (Object.keys(stats).length === 0) {
      console.log('   (empty database)');
    } else {
      Object.entries(stats).forEach(([collection, count]) => {
        console.log(`   ${collection}: ${count} documents`);
      });
    }
  }

  async listCollections() {
    const db = await this.testServer.getDatabase();
    const collections = await db.listCollections().toArray();

    console.log('\n📁 Collections:');
    if (collections.length === 0) {
      console.log('   (no collections)');
    } else {
      collections.forEach((col) => {
        console.log(`   - ${col.name}`);
      });
    }
  }

  async showCollection(name: string) {
    if (!name) {
      console.log('Usage: show <collection-name>');
      return;
    }

    const db = await this.testServer.getDatabase();
    const collection = db.collection(name);
    const documents = await collection.find({}).limit(10).toArray();
    const total = await collection.countDocuments();

    console.log(`\n📄 Collection: ${name} (showing ${documents.length}/${total} documents)`);

    if (documents.length === 0) {
      console.log('   (empty collection)');
    } else {
      documents.forEach((doc, index) => {
        console.log(`\n[${index + 1}]`);
        console.log(JSON.stringify(doc, null, 2));
      });

      if (total > 10) {
        console.log(`\n... and ${total - 10} more documents`);
      }
    }
  }

  async clearDatabase() {
    console.log('🧹 Clearing database...');
    await this.testServer.clearDatabase();
    console.log('✅ Database cleared');
  }

  async dropDatabase() {
    console.log('🗑️ Dropping database...');
    await this.testServer.dropDatabase();
    console.log('✅ Database dropped');
  }

  async seedData(type?: string) {
    console.log(`🌱 Seeding ${type || 'basic'} data...`);

    let data;
    if (type === 'performance') {
      data = await TestDataSeeder.seedPerformanceData(10, 5);
    } else {
      data = await TestDataSeeder.seedBasicData();
    }

    await this.testServer.seedData(data);
    console.log('✅ Data seeded successfully');
  }

  async resetDatabase() {
    console.log('♻️ Resetting database...');
    await DatabaseReset.resetToCleanState();
    console.log('✅ Database reset to clean state');
  }

  showUri() {
    console.log(`\n🔗 Connection URI: ${this.testServer.getUri()}`);
  }

  async createIndexes() {
    console.log('📍 Creating indexes...');
    await this.testServer.createIndexes();
    console.log('✅ Indexes created');
  }

  async findDocuments(collectionName: string, query: string) {
    if (!collectionName) {
      console.log('Usage: find <collection> <query>');
      return;
    }

    const db = await this.testServer.getDatabase();
    const collection = db.collection(collectionName);

    let filter = {};
    if (query) {
      try {
        // Simple key:value parsing
        const [key, value] = query.split(':');
        filter = { [key]: value };
      } catch {
        console.log('Invalid query format. Use key:value');
        return;
      }
    }

    const documents = await collection.find(filter).limit(10).toArray();
    console.log(`\n🔍 Found ${documents.length} documents:`);

    documents.forEach((doc, index) => {
      console.log(`\n[${index + 1}]`);
      console.log(JSON.stringify(doc, null, 2));
    });
  }

  async countDocuments(collectionName: string) {
    if (!collectionName) {
      console.log('Usage: count <collection>');
      return;
    }

    const db = await this.testServer.getDatabase();
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments();

    console.log(`\n📊 ${collectionName}: ${count} documents`);
  }

  async exportData(filename?: string) {
    const file = filename || `mongodb-export-${Date.now()}.json`;
    const db = await this.testServer.getDatabase();
    const collections = await db.collections();

    const data: Record<string, unknown[]> = {};

    for (const collection of collections) {
      const docs = await collection.find({}).toArray();
      data[collection.collectionName] = docs;
    }

    const fs = await import('fs/promises');
    await fs.writeFile(file, JSON.stringify(data, null, 2));

    console.log(`✅ Exported to ${file}`);
  }

  async importData(filename: string) {
    if (!filename) {
      console.log('Usage: import <filename>');
      return;
    }

    const fs = await import('fs/promises');
    const data = JSON.parse(await fs.readFile(filename, 'utf-8'));

    await this.testServer.clearDatabase();

    const db = await this.testServer.getDatabase();

    for (const [collectionName, documents] of Object.entries(data)) {
      if (Array.isArray(documents) && documents.length > 0) {
        const collection = db.collection(collectionName);
        await collection.insertMany(documents);
        console.log(`   Imported ${documents.length} documents to ${collectionName}`);
      }
    }

    console.log(`✅ Imported from ${filename}`);
  }
}

// Run the CLI if executed directly
if (require.main === module) {
  const cli = new MongoDBDebugCLI();
  cli.start().catch(console.error);
}
