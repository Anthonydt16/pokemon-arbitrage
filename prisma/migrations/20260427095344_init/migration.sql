-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "minPrice" REAL NOT NULL DEFAULT 0,
    "maxPrice" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "lastAvgPrice" REAL,
    "lastScrapeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "imageUrl" TEXT,
    "cardMarketPrice" REAL,
    "margin" REAL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustScore" INTEGER,
    "trustLevel" TEXT,
    "trustFlags" TEXT,
    "photoCount" INTEGER,
    "isPro" BOOLEAN,
    CONSTRAINT "Deal_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "discordWebhook" TEXT,
    "alertMinMargin" REAL NOT NULL DEFAULT 15,
    "alertGlobal" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_url_key" ON "Deal"("url");
