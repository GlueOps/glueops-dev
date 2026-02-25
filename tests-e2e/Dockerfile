FROM mcr.microsoft.com/playwright:v1.53.2-noble@sha256:60c416740c425693f774300baedb27be5190d12389ed8524d639ca203347258f

WORKDIR /tests
RUN npm init -y && npm install @playwright/test@1.49.1

COPY captain-domain.spec.ts playwright.config.ts .

CMD ["npx", "playwright", "test", "--reporter=list"]
