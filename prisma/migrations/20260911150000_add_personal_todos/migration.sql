-- CreateTable
CREATE TABLE IF NOT EXISTS "personal_todos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_todos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "personal_todos_createdById_idx" ON "personal_todos"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "personal_todos_assignedToId_idx" ON "personal_todos"("assignedToId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'personal_todos_createdById_fkey'
    ) THEN
        ALTER TABLE "personal_todos" ADD CONSTRAINT "personal_todos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'personal_todos_assignedToId_fkey'
    ) THEN
        ALTER TABLE "personal_todos" ADD CONSTRAINT "personal_todos_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
