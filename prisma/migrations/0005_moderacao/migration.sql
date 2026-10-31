-- AlterTable
ALTER TABLE "CommentEvent" ADD COLUMN     "ocultado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolvido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "respostaManual" TEXT;
