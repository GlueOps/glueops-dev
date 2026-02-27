# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

### Installation

```
$ yarn
```

### Local Development

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without
having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting
service.

### Docker

#### Production (static HTML served by nginx)

Build and run a lightweight production image that serves pre-built static HTML via nginx:

```
$ docker build -t glueops-dev .
$ docker run -p 80:80 glueops-dev
```

The site will be available at `http://localhost`.

#### Development (live reload)

Build and run a development image with the Docusaurus dev server and hot module reloading:

```
$ docker build -f Dockerfile.dev -t glueops-dev:dev .
$ docker run -p 8080:80 -v $(pwd):/app -v /app/node_modules glueops-dev:dev
```

The dev server will be available at `http://localhost:8080` with live reload — edits to local files are reflected immediately.

> **Note:** The `-v /app/node_modules` anonymous volume prevents your local `node_modules` from overwriting the container's installed dependencies.

### Deployment

Using SSH:

```
$ USE_SSH=true yarn deploy
```

Not using SSH:

```
$ GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to
the `gh-pages` branch.