FROM mcr.microsoft.com/playwright:v1.58.2-noble@sha256:6446946a1d9fd62d9ae501312a2d76a43ee688542b21622056a372959b65d63d

WORKDIR /tests
RUN npm init -y && npm install @playwright/test@1.49.1

COPY captain-domain.spec.ts playwright.config.ts .

CMD ["npx", "playwright", "test", "--reporter=list"]
