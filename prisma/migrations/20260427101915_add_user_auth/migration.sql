-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Search" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "minPrice" REAL NOT NULL DEFAULT 0,
    "maxPrice" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "lastAvgPrice" REAL,
    "lastScrapeAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Search" ("active", "createdAt", "id", "isGlobal", "keywords", "lastAvgPrice", "lastScrapeAt", "maxPrice", "minPrice", "name", "platforms", "updatedAt") SELECT "active", "createdAt", "id", "isGlobal", "keywords", "lastAvgPrice", "lastScrapeAt", "maxPrice", "minPrice", "name", "platforms", "updatedAt" FROM "Search";
DROP TABLE "Search";
ALTER TABLE "new_Search" RENAME TO "Search";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
