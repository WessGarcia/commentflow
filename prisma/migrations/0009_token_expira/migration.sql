-- Validade do token do login do Instagram (60 dias, renovado pelo painel)
ALTER TABLE "Account" ADD COLUMN "tokenExpiraEm" TIMESTAMP(3);
