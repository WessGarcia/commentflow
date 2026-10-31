-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "igsid" TEXT NOT NULL,
    "username" TEXT,
    "nome" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "notas" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "etapa" TEXT NOT NULL DEFAULT 'novo',
    "status" TEXT NOT NULL DEFAULT 'resolvida',
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "ultimaEntrada" TIMESTAMP(3),
    "ultimaMsg" TIMESTAMP(3),
    "lidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "mid" TEXT,
    "direcao" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_igsid_key" ON "Contact"("igsid");

-- CreateIndex
CREATE INDEX "Contact_ultimaMsg_idx" ON "Contact"("ultimaMsg");

-- CreateIndex
CREATE UNIQUE INDEX "Message_mid_key" ON "Message"("mid");

-- CreateIndex
CREATE INDEX "Message_contactId_createdAt_idx" ON "Message"("contactId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Quem já comentou vira contato, com o comentário como primeira mensagem.
INSERT INTO "Contact" ("id", "igsid", "username", "ultimaMsg", "createdAt", "updatedAt")
SELECT 'c' || md5(c."fromUserId"), c."fromUserId",
       (array_agg(c."fromUsername" ORDER BY c."receivedAt" DESC))[1],
       max(c."receivedAt"), min(c."receivedAt"), now()
FROM "CommentEvent" c
WHERE c."fromUserId" IS NOT NULL
GROUP BY c."fromUserId"
ON CONFLICT ("igsid") DO NOTHING;

INSERT INTO "Message" ("id", "contactId", "mid", "direcao", "origem", "texto", "createdAt")
SELECT 'm' || md5(c."commentId"), ct."id", 'comment:' || c."commentId", 'entrada', 'comentario', coalesce(c."text", ''), c."receivedAt"
FROM "CommentEvent" c
JOIN "Contact" ct ON ct."igsid" = c."fromUserId"
ON CONFLICT ("mid") DO NOTHING;
