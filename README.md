# RWA FaunaDB + Reaflow + Next.js + Magic link

This project is a Real-World App featuring [FaunaDB](https://fauna.com/) as real-time database, [Reaflow](https://github.com/reaviz/reaflow) as graph editor, and [Magic Link](https://magic.link/) for passwordless authentication.

It also uses the famous Next.js framework, and it's hosted on Vercel.

This RWA is meant to help beginners with any of the above-listed tools learn how to build a real app, using best-practices.
Therefore, the codebase is heavily documented, not only the README but also every file in the project.

The app allows users to create a discussion workflow in a visual way. 
It displays information, questions and branching logic (if/else).
It works in real-time for better collaboration, and provides features similar as if you'd be building a Chatbot discussion.

## You want to learn?

Take a look at the **[Variants](#Variants)** below **before jumping in the source code**.
As part of my developer journey, I've reached different milestones and made different branches/PR for each of them.
If you're only interested in Reaflow, or Magic Auth, or FaunaDB Real-Time streaming, **they'll help you focus on what's of the most interest to you**.

> _If you like what you're seeing, take a look at [Next Right Now](https://github.com/UnlyEd/next-right-now), a **production-grade boilerplate** for the Next.js framework._

## Online demo

[Demo](https://rwa-faunadb-reaflow-nextjs-magic.vercel.app/) (automatically updated from the `master` branch).

![image](https://user-images.githubusercontent.com/3807458/109431687-08bf1680-7a08-11eb-98bd-31fa91e21680.png)

## Features

This RWA comes with the following features:
- Source code heavily **documented**
- Strong TS typings
- **Graph Editor** (Reaflow)
    - Different kinds of node (`start`, `end`, `if`, `information`, `question`) with different layouts for each type _(see [NodeRouter component](blob/main/src/components/nodes/NodeRouter.tsx))_
    - Nodes use `foreignObject`, which complicates things quite a bit (events, css), but it's the only way of writing HTML/CSS within an SVG `rect` (custom nodes UI)
    - Advanced support for **`foreignObject`** and best-practices
    - Native Reaflow Nodes, Edges and Ports are extended for reusability _(**BaseNode** component, **BaseNodeData** type, **BaseEdge** component, **BaseEdgeData** type, etc.)_,
        which makes it easy to quickly change the properties of all nodes, edges, ports, etc.
    - Creation of nodes visually, through the `BlockPickerMenu` component
    - **Undo/redo** support (with shortcuts)
    - Node/edge **deletion**
    - Node **duplication**
    - **Selection** of nodes and edges (one at a time)
    - Automatically re-calculate the **height** of nodes when jumping lines in `textarea`
        - _This is much harder than it might look like, because it triggers concurrent state updates that need to be [queued](./src/utils/canvasDatasetMutationsQueue.ts) so we don't lose part of the changes_
- **Shared state manager**
    - Uses **`Recoil`**
        - It was my first time using Recoil, and I like it even more than I thought I would. It's very easy to use.
        - The one thing that needs improvement are DevTools, it's not as powerful as other state manager have (Redux, MobX, etc.).
          There are only few tools out there, and even fewer are compatible with Next.js.
    - [recoil-devtools](https://github.com/ulises-jeremias/recoil-devtools) available (hit `(ctrl/cmd)+h`)
- Passwordless Authentication (Magic Link)
  - Use Next.js API endpoint to authenticate the user securely
  - Stores a `token` cookie that can only be read/written from the server side (`httpOnly`)
  - Use `/api/login` endpoint that reads the token on the server side and returns its content, used by the frontend to know if the current user is authenticated
- **Real-time DB (FaunaDB)**
  - Graph data _(nodes, edges, AKA `CanvasDataset`)_ are **persisted** in FaunaDB and automatically loaded upon page load
  - Real-time stream for collaboration (open 2 tabs)
    - When **not authenticated** (AKA "Guest"):
      - FaunaDB token is public and has read/write access rights on one special shared document of the "Canvas" collection
        - It cannot read/write anything else in the DB, it's completely safe
      - All guests share the same "Canvas" document in the DB
    - When **authenticated** (AKA "Editor"):
      - A FaunaDB token is generated upon login and stored in the `token` cookie. This token is linked to the user and hold the **permissions** granted to the user.
      Therefore, it will only allow what's configured in the FaunaDB "Editor" role.
    - This RWA will **not improve further** the collaborative experience, it's only a POC (undo/redo undoes peer actions)
- Support for **Emotion 11** (CSS in JS)
- FaunaDB IaC (Infrastructure as Code)
    - Using [`fauna-gql-upload`](https://github.com/Plazide/fauna-gql-upload) to sync the project's configuration with the FaunaDB database.
    - Makes it easy to replicate a whole database.
    - Simplifies FaunaDB configuration updates (roles, indexes, functions (UDF), GraphQL schema) through `yarn fauna:sync`.
    - The code acts as the source of truth for the whole configuration, and it can be versioned.
- FaunaDB GraphQL
    - Uses `.graphqlconfig` file to easily sync the FaunaDB GraphQL schema with the local project. (updates `schema.graphql`)
    - The `schema.graphql` is used by GraphQL queries/mutations and provides autocompletion and advances in-editor debugging capabilities.

_Known limitations_:
- Editor direction is `RIGHT` (hardcoded) and adding nodes will add them to the right side, always (even if you change the direction)
    - I don't plan on changing that at the moment

## Variants

While working on this project, I've reached several milestones with a different set of features, available as "Examples":

1. [`with-local-storage`](https://github.com/Vadorequest/poc-nextjs-reaflow/tree/with-local-storage)
    ([Demo](https://poc-nextjs-reaflow-git-with-local-storage-ambroise-dhenain.vercel.app/) | [Diff](https://github.com/Vadorequest/poc-nextjs-reaflow/pull/14)):
    - The canvas dataset is stored in the browser localstorage. 
    - There is no real-time and no authentication.
1. [`with-faunadb-real-time`](https://github.com/Vadorequest/poc-nextjs-reaflow/tree/with-faunadb-real-time)
   ([~~Demo~~](https://poc-nextjs-reaflow-git-with-faunadb-real-time-ambroise-dhenain.vercel.app/)
   | [Diff](https://github.com/Vadorequest/poc-nextjs-reaflow/pull/13)):
    - The canvas dataset is not stored in the browser local storage, **but in FaunaDB instead**.
    - Changes to the canvas are real-time and shared with everyone.
    - Everybody shares the same working document.
    - The real-time implementation is very basic (no stream manager) and has known issues, it can potentially trigger infinite loops.
    - The online demo has been disabled because of this.
    _-_ The real-time implementation has been improved in `with-faunadb-auth`, by using a stream manager.
1. [`with-magic-link-auth`](https://github.com/Vadorequest/poc-nextjs-reaflow/tree/with-magic-link-auth)
   ([~~Demo~~](https://poc-nextjs-reaflow-git-with-magic-link-auth-ambroise-dhenain.vercel.app/)
   | [Diff](https://github.com/Vadorequest/poc-nextjs-reaflow/pull/15)):
    - Users can create an account and login using Magic Link, but they still share the same Canvas document as guests.
    - Overall, although user can now log in, it doesn't change anything on the UI.
    - Logging in using Magic Link doesn't authenticate to FaunaDB.
    - The online demo has been disabled because of the random infinite loop issues above-mentioned.
1. [`with-faunadb-auth`](https://github.com/Vadorequest/poc-nextjs-reaflow/tree/with-faunadb-auth)
   ([Demo](https://poc-nextjs-reaflow-git-with-faunadb-auth-ambroise-dhenain.vercel.app/) | [Diff](https://github.com/Vadorequest/poc-nextjs-reaflow/pull/12)):
    - Authenticated users get a user-specific token which is used to authenticate themselves to FaunaDB (real-time).
    - Authenticated users do not share a common document.
    - Authenticated users work on their own document and nobody else can change documents that don't belong to them.
1. [`with-fauna-fgu`](https://github.com/Vadorequest/poc-nextjs-reaflow/tree/with-faunadb-fgu)
   ([Demo](https://poc-nextjs-reaflow-git-with-fauna-fgu-ambroise-dhenain.vercel.app/) | [Diff](https://github.com/Vadorequest/poc-nextjs-reaflow/pull/19)):
    - Fixed FQL scripts used to configure FaunaDB (indexes, roles). They weren't working properly, and I didn't notice because I wasn't using them until now.
    - A new command `yarn fauna:sync` automatically syncs the GraphQL schema, alongside indexes, roles, UDF, etc. It uses [FaunaDB GraphQL Upload (FGU)](https://github.com/Plazide/fauna-gql-upload).
    - It is now possible to easily replicate an environment from scratch to a new FaunaDB database. (DevOps)
    - The repository (source code) now acts as a single source of truth for the FaunaDB configuration, which is much better for automation/replication.
1. [`with-fauna-graphql`](https://github.com/Vadorequest/poc-nextjs-reaflow/tree/with-faunadb-graphql)
   ([Demo](https://poc-nextjs-reaflow-git-with-fauna-graphql-ambroise-dhenain.vercel.app/) | [Diff](https://github.com/Vadorequest/poc-nextjs-reaflow/pull/20)):
    - Use GraphQL to create new projects and change the current project's name.

> **Notes**:
> - The last example is always available in the `main` branch.
> - Although there are multiple examples to ease understanding of what's changed for each step, I strongly recommend using the latest version of the source code if you wish to implement your own version.
>   This is because the latest version fixes a lot of downstream issues and benefits from the latest patches and updates. I haven't fixed issues in old examples, and I won't.

## Getting started

> If you want to use this project to start your own, you can either clone it using git and run the below commands, or "Deploy your own" using the Vercel button, which will create for you the Vercel and GitHub project (but won't configure environment variables for you!).

- `yarn`
- `yarn start`
- `cp .env.local.example .env.local`, and define the `FGU_SECRET` environment variable
- `yarn fauna:sync` will create all collections, indexes, roles, UDF in the Fauna database related to the `FGU_SECRET` environment variable
- Define other environment variables (`NEXT_PUBLIC_SHARED_FAUNABD_TOKEN` and `FAUNADB_SERVER_SECRET_KEY` can only be created once roles have been created during the previous step when running `yarn fauna:sync`)
- Open browser at [http://localhost:8890](http://localhost:8890)

If you deploy it to Vercel, you'll need to create Vercel environment variables for your project. (see `.env.local.example` file)

> Note: The current setup uses only one environment, the dev/staging/prod deployments all use the same database.

## Deploy your own

Deploy the example using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/Vadorequest/poc-nextjs-reaflow&project-name=poc-nextjs-reaflow&repository-name=poc-nextjs-reaflow)

## Roadmap

Here are the future variants I intend to work on:

- Tests framework: Unfortunately, FQL is really complicated to get right, any small mistake can cost hours of debugging.
  Thanks to `fauna-gql-upload`, the project is much easier to manage now, but it's still lacking observability.
  I want to bring high observability to quickly understand from where errors come from, by having a whole test suite built around the project, and testing every role and FQL/GQL functions.
  This might use [`fauna-schema-migrate`](https://github.com/fauna-brecht/fauna-schema-migrate) once it's more mature. (it'd replace the current `fauna-gql-upload`)

External help on those features is much welcome! Please contribute ;)

---

# Advanced

This section is for developers who want to understand even deeper how things work.

## Application overview

Users can be either **Guests** or **Editors**.

All requests to FaunaDB are made **from the frontend**. Even though, **they're completely secure** due to a proper combination of tokens and roles/permissions.

### Guests permissions (FaunaDB)

By default, users are guests. Guests all share the same working document and see changes made by others in real-time. They can only access (read/write) that
special shared document.

Guests use a special FaunaDB token generated from the "Public" role. They all share that same token. The token doesn't expire. Also, the token **only allows
read/write on the special shared document** (ID: "1"), see the `/fql/setup.js` file "Public" role.

Therefore, the public token, even though it's public, cannot be used to perform any other operation than read/write that single document.

### Editors permissions (FaunaDB)

Editors are authenticated users who can only access (read/write) their own documents.

A editor-related token is generated upon successful login and is used in the client to authenticate to FaunaDB. Even though the token is used by the browser,
it's still safe because the token is only readable/writeable from the server. (`httpOnly: true`)

Also, the token won't allow read/write on other documents than their owner, see the `/fql/setup.js` file "Editor" role.

### Authentication (Magic + FaunaDB + Next.js API)

Users authenticate through Magic Link (passwordless) sent to the email they used. Magic helps to simplify the authentication workflow by ensuring the users use
a valid email (they must click on a link sent to their email inbox to log in).

When the user clicks on the link in their inbox, Magic generates a `DID token`, which is then used as authentication `Bearer token` and sent to our `/api/login`
.

The `/api/login` endpoint checks the DID token and then generates a FaunaDB token (`faunaDBToken`) attached to the user. This `faunaDBToken` is then stored in
the `token` cookie (httpOnly), alongside other user-related information (UserSession object), such as their `email` and FaunaDB `ref` and `id`.

This token will then be read (`/api/user` endpoint) when the user loads the page.

_Even though there are 2 buttons (login/create account), both buttons actually do the same thing, and both can be used to sign-in and sign-up. That's because we
automatically log in new users, so whether they were an existing user or not doesn't change the authentication workflow. It made more sense (UX) to have two
different buttons, that's what people usually expect, so we made it that way._

### Workflow editor (Reaflow)

The editor provides a GUI allowing users to add "nodes" and "edges" connecting those nodes. It is meant to help them **build a workflow** using nodes such as "
Information", "Question" and "If/Else".

The workflow in itself **doesn't do anything**, it's purely visual. It typically represents a discussion a user would have with a Chatbot.

The whole app only use one page, that uses Next.js SSG mode (it's statically rendered, and the page is generated at build time, when deploying the app).

### Real-time streaming (FaunaDB)

Once the user session has been fetched (through `/api/user`), the `CanvasContainer` is rendered. One of its child component, `CanvasStream` automatically opens
a stream connection to FaunaDB on the user's document (the shared document if **Guest**, or the first document that belongs to the **Editor**).

When the stream is opened, it automatically retrieves the current state of the document and updates the local state (Recoil).

When changes are made on the document, FaunaDB send a push notification to all users subscribed to that document. This also happens when the user X updates the
document (they receives a push notification if they're the author of the changes, too). In such case, the update is being ignored for performances reasons (we
don't need to update a local state that is already up-to-date).

## GraphQL

I strongly suggest reading:

- https://docs.fauna.com/fauna/current/tutorials/graphql/
- https://docs.fauna.com/fauna/current/api/graphql/

### Fauna GraphQL Editor

I used [FaunaDB GraphQL Editor](https://faunadb-graphql-editor.vercel.app/) to generate our schema visually, because I'm not so familiar with GraphQL schema definition (the server-side part of GQL).

> _Disclaimer: I'm the author of [FaunaDB GraphQL Editor](https://faunadb-graphql-editor.vercel.app/)_

### Auto-generated GraphQL schema definitions

The `fauna/gql/source-schema.gql` file contains only the **GraphQL types**, it is **the input schema** that'll be used to generate the `schema.graphql` file.

The `fauna/gql/source-schema.gql` file is uploaded to FaunaDB GraphQL endpoint by [FaunaDB GQL Upload](https://github.com/Plazide/fauna-gql-upload) when running `yarn fauna:sync`.
There, FaunaDB has some internal magic that will create a new schema that you can see in the [FaunaDB Dashboard > GraphQL](https://dashboard.fauna.com/).

> Note: The `fauna/gql` folder is being ignored by WebStorm to avoid conflicting with the `schema.graphql` which is the one we really want to use for autocompletion.

### GraphQL Config WebStorm plugin

I use the [GraphQL Config WebStorm plugin](https://github.com/jimkyndemeyer/js-graphql-intellij-plugin) which send an introspection request to `https://graphql.fauna.com/graphql` using an Admin/Server key to authenticate.

This generates the `schema.graphql`, which is then made available to all our GraphQL files and provides auto-completion and advanced helpers when writing GraphQL queries/mutation.

## Reaflow Graph (ELK)

ELKjs (and ELK) are used to draw the graph (nodes, edges).
It's what Reaflow uses in the background.
ELK stands for **Eclipse Layout Kernel**.

It seems to be one of the best Layout manager out there.

Unfortunately, it is quite complicated and lacks a comprehensive documentation.

You'll need to dig into the ELK documentation and issues if you're trying to change **how the graph's layout behaves**.
Here are some good places to start and useful links I've compiled for my own sake.

- [ELKjs GitHub](https://github.com/kieler/elkjs)
- [ELK official website](https://www.eclipse.org/elk/)
- [ELK Demonstrators](https://rtsys.informatik.uni-kiel.de/elklive/index.html)
  - [Tool to convert `elkt <=> json` both ways](https://rtsys.informatik.uni-kiel.de/elklive/conversion.html)
  - [Tool to convert `elkt` to a graph](https://rtsys.informatik.uni-kiel.de/elklive/elkgraph.html)
  - [Java ELK implementation of the `layered` algorithm](https://github.com/eclipse/elk/tree/master/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers)
  - [Community examples soure code](https://github.com/eclipse/elk-models/tree/master/examples) _(which are displayed on [ELK examples](https://rtsys.informatik.uni-kiel.de/elklive/examples.html))_
  - [Klayjs example](http://kieler.github.io/klayjs-d3/examples/interactive) (ELK is the sucessor of KlayJS and [should support the same options](https://github.com/kieler/elkjs/issues/122#issuecomment-777781503))
- [Issues opened by Austin](https://github.com/kieler/elkjs/issues?q=is%3Aissue+sort%3Aupdated-desc+author%3Aamcdnl)
- [Issues opened by Vadorequest](https://github.com/kieler/elkjs/issues?q=is%3Aissue+sort%3Aupdated-desc+author%3Avadorequest)

Known limitations:
- [Tracking issue - Manually positioning the nodes ("Standalone Edge Routing")](https://github.com/eclipse/elk/issues/315)

---

# Inspirations

Here is a list of online resources and open-source repositories that have been the most helpful:

**Understanding FaunaDB:**
- https://fauna.com/blog/modernizing-from-postgresql-to-serverless-with-fauna-part-1

**Authentication and authorization:**
- https://docs.fauna.com/fauna/current/tutorials/basics/authentication?lang=javascript
- https://magic.link/posts/todomvc-magic-nextjs-fauna (tuto Magic + Next.js + FaunaDB)
    - https://github.com/magiclabs/example-nextjs-faunadb-todomvc (repo)

**Real-time streaming:**
- https://github.com/fauna-brecht/fauna-streaming-example Very different from what is built here, but holds solid foundations about streaming
  - https://github.com/fauna-brecht/fauna-streaming-example/blob/776c911eb4/src/data/streams.js

**FaunaDB Real-world apps (RWA):**
- https://docs.fauna.com/fauna/current/start/apps/fwitter
- https://github.com/fauna-brecht/skeleton-auth
- https://github.com/fillipvt/with-graphql-faunadb-cookie-auth
- https://github.com/fauna-brecht/fauna-streaming-example
- https://github.com/magiclabs/example-nextjs-faunadb-todomvc

**FaunaDB FQL:**
- UDF
  - https://docs.fauna.com/fauna/current/security/roles API definitions for CRUD ops
- https://github.com/shiftx/faunadb-fql-lib
- https://docs.fauna.com/fauna/current/cookbook/?lang=javascript
- https://github.com/fauna-brecht/faunadb-auth-skeleton-frontend/blob/default/fauna-queries/helpers/fql.js

**FaunaDB GQL:**
- https://css-tricks.com/instant-graphql-backend-using-faunadb/
- https://github.com/ptpaterson/faunadb-graphql-schema-loader
- https://github.com/Plazide/fauna-gql-upload
- Schema management
  - https://github.com/fillipvt/with-graphql-faunadb-cookie-auth/blob/master/scripts/uploadSchema.js

**FaunaDB DevOps:**
- https://github.com/fauna-brecht/fauna-schema-migrate

**FaunaDB Community resources:**
- https://github.com/n400/awesome-faunadb
  - https://gist.github.com/BrunoQuaresma/0236aff64dc44795f19994cbc7a07db6 React query hook
  - https://gist.github.com/tovbinm/f76bcbf56ea8e2e3740e237b6c2f2ab9 GraphQL relation query examples
  - https://gist.github.com/TracyNgot/291738b403cfa012fe7bf05614c22408 Query builder

---

# Real-time implementation, limits, and considerations for the future

The way the current real-time feature is implemented is not too bad, but not great either.

It works by syncing the whole dataset whether the remote `document` (on FaunaDB) is updated, which in turn updates all subscribed clients (except the author).
While this works, changes from one client can be overwritten by another client when they happen at the same time.

> `document` means "Canvas Dataset" here. It contains all `nodes` and `edges` (and other props, like `owner`, etc.)

A better implementation would be not to stream the actual `document`, but only the document's **patches**.
The whole `document` would only be useful for the initialization of the app.
Then, any change should be streamed to another document which would only contain the changes applied to the initial document.
When such changes are streamed (patches), they should then be applied to the current working document, one by one, in order.

Each change/patch would represent a diff between the previous and after states of the document, they would only contain **what** have changed:
- A node has been added
- An edge has been deleted
- An edge has been modified

This way, when something changes, the client would resolve what's changed and stream the patch to the DB, which in turn would update all subscribed clients which would apply that patch.

Conflict may still arise, but they'll be limited to parts of the document that have been updated simultaneously (the same node, the same edge, etc.).

This would provide a much better user experience, because overwrites will happen much less often, and it'd increase collaboration.
