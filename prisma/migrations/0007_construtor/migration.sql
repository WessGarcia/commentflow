-- AlterTable
ALTER TABLE "Flow" ADD COLUMN     "grafo" JSONB;

-- CreateTable
CREATE TABLE "Execucao" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "igsid" TEXT NOT NULL,
    "commentId" TEXT,
    "privadaUsada" BOOLEAN NOT NULL DEFAULT false,
    "noAtual" TEXT,
    "status" TEXT NOT NULL DEFAULT 'andando',
    "proximaEm" TIMESTAMP(3),
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Execucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clique" (
    "id" TEXT NOT NULL,
    "execucaoId" TEXT,
    "igsid" TEXT,
    "flowId" TEXT,
    "url" TEXT NOT NULL,
    "cliques" INTEGER NOT NULL DEFAULT 0,
    "primeiroEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Execucao_status_proximaEm_idx" ON "Execucao"("status", "proximaEm");

-- CreateIndex
CREATE INDEX "Execucao_igsid_status_idx" ON "Execucao"("igsid", "status");

-- CreateIndex
CREATE INDEX "Clique_igsid_idx" ON "Clique"("igsid");

-- AddForeignKey
ALTER TABLE "Execucao" ADD CONSTRAINT "Execucao_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clique" ADD CONSTRAINT "Clique_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "Execucao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
