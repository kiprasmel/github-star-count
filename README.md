# github-star-count

efficiently fetch (using graphql) how many stars have all repos of a user received.

## Usage

```sh
echo "username" > USERNAME
echo "gh_api_token" > TOKEN

node ./github-star-count.js
```

notes:

- github's api token is sufficient w/o any extra permissions
- we use node's `fetch`, thus `node` version >=18 is needed
  - or you could install [node-fetch](https://www.npmjs.com/package/node-fetch) (`npm i node-fetch@2`)
