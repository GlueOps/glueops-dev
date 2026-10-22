FROM mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27

WORKDIR /tests
RUN npm init -y && npm install @playwright/test@1.58.2

COPY captain-domain.spec.ts playwright.config.ts .

CMD ["npx", "playwright", "test", "--reporter=list"]
