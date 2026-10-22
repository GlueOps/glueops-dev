FROM mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48

WORKDIR /tests
RUN npm init -y && npm install @playwright/test@1.58.2

COPY captain-domain.spec.ts playwright.config.ts .

CMD ["npx", "playwright", "test", "--reporter=list"]
