FROM mcr.microsoft.com/playwright:v1.50.1-noble@sha256:ac7053180325ef75d31774c458d0bb9b55ac153ae1be3d104b80c6c1bb6a067c

WORKDIR /tests
RUN npm init -y && npm install @playwright/test@1.49.1

COPY captain-domain.spec.ts playwright.config.ts .

CMD ["npx", "playwright", "test", "--reporter=list"]
