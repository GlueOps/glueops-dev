FROM mcr.microsoft.com/playwright:v1.51.1-noble@sha256:146d046a8d79a1b3a87596c4457b0b1c47f811bf4fc2cc1b99e873ae7f1cbbbd

WORKDIR /tests
RUN npm init -y && npm install @playwright/test@1.49.1

COPY captain-domain.spec.ts playwright.config.ts .

CMD ["npx", "playwright", "test", "--reporter=list"]
