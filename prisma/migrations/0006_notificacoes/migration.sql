-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "destaque" TEXT,
    "texto" TEXT NOT NULL,
    "link" TEXT,
    "etiqueta" TEXT,
    "chave" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notificacao_chave_key" ON "Notificacao"("chave");

-- CreateIndex
CREATE INDEX "Notificacao_createdAt_idx" ON "Notificacao"("createdAt");
