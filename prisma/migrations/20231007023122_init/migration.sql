-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GAuthCredentials" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "googleId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiryDate" BIGINT NOT NULL,
    "webhookChannelId" TEXT,
    "webhookChannelExpiration" TIMESTAMP(3),
    "webhookResourceId" TEXT,
    "changesPageToken" TEXT,
    "handle" TEXT,
    "dbCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GAuthCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MondayAuthCredentials" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "mondayId" INTEGER NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "dbCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MondayAuthCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "dbCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleDriveFile" (
    "id" SERIAL NOT NULL,
    "fileId" INTEGER NOT NULL,
    "googleId" TEXT,
    "name" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "dbCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleDriveFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "fileId" INTEGER,
    "authorId" INTEGER NOT NULL,
    "platform" TEXT,
    "platformId" TEXT,
    "platformDiscussionId" TEXT,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "dbCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentAuthor" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "platformId" TEXT,
    "platformName" TEXT,
    "platformEmail" TEXT,
    "dbCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FileToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GAuthCredentials_userId_key" ON "GAuthCredentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MondayAuthCredentials_userId_key" ON "MondayAuthCredentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleDriveFile_fileId_key" ON "GoogleDriveFile"("fileId");

-- CreateIndex
CREATE INDEX "GoogleDriveFile_googleId_idx" ON "GoogleDriveFile"("googleId");

-- CreateIndex
CREATE INDEX "Comment_platformId_idx" ON "Comment"("platformId");

-- CreateIndex
CREATE INDEX "Comment_platformDiscussionId_idx" ON "Comment"("platformDiscussionId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "CommentAuthor_userId_idx" ON "CommentAuthor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_FileToUser_AB_unique" ON "_FileToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToUser_B_index" ON "_FileToUser"("B");

-- AddForeignKey
ALTER TABLE "GAuthCredentials" ADD CONSTRAINT "GAuthCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MondayAuthCredentials" ADD CONSTRAINT "MondayAuthCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleDriveFile" ADD CONSTRAINT "GoogleDriveFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CommentAuthor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentAuthor" ADD CONSTRAINT "CommentAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToUser" ADD CONSTRAINT "_FileToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToUser" ADD CONSTRAINT "_FileToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
