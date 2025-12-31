-- CreateIndex
CREATE INDEX "transactions_categoryId_idx" ON "transactions"("categoryId");

-- CreateIndex
CREATE INDEX "transactions_statementId_idx" ON "transactions"("statementId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");
