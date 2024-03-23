#!/usr/bin/env node

const fetch = require("node-fetch")

async function fetchStarsOfUserRepos({
	login = readfileSync(require("path").join(__dirname, "USERNAME")), //
	token = readfileSync(require("path").join(__dirname, "TOKEN")),
	/**
	 * set to `true` if only care about total count,
	 * because will affect the json output:
	 *
	 * if true, won't add repos w/ 0 stars
	 * because they simply won't be fetched.
	 */
	BREAK_IF_ENCOUNTERED_ZERO_STARS_SINCE_SORTED = false,
	REPOS_PER_REQ = 100,
} = {}) {
	const startTime = new Date().toISOString();

	const pages = [];

	let pageIdx = 0;
	let getCurrFetchedRepos = () => REPOS_PER_REQ * pageIdx;

	let totalRepoCount = Infinity;
	let maxFetchedRepoCount;
	let lastFetchedRepoCursor;
	let brokeEarlyBecauseFoundZeroStars = false;

	let totalStarCount = 0;

	while ((maxFetchedRepoCount = getCurrFetchedRepos()) < totalRepoCount) {
		const variables = {
			login,
			first: 100,
			...(!!lastFetchedRepoCursor ? { after: lastFetchedRepoCursor } : {}),
		};

		console.log({ variables });

		const res = await fetch("https://api.github.com/graphql", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				query: QUERY_USER_REPOS_STARS, //
				variables,
			}),
		});

		const page = await res.json();

		if (page.errors) {
			const { errors } = page;
			console.error({ errors });

			throw new Error("failed fetching");
		}

		pages.push(page);

		totalRepoCount = page.data.user.repositories.totalCount;
		totalStarCount += page.data.user.repositories.edges.map((e) => e.node.stargazers.totalCount).reduce(sum, 0);

		const lastEdge = page.data.user.repositories.edges.at(-1);
		lastFetchedRepoCursor = lastEdge.cursor;

		++pageIdx;

		console.log({
			totalRepoCount, //
			pageIdx,
			maxFetchedRepoCount,
			totalStarCount,
		});

		if (BREAK_IF_ENCOUNTERED_ZERO_STARS_SINCE_SORTED) {
			if (lastEdge.node.stargazers.totalCount === 0) {
				brokeEarlyBecauseFoundZeroStars = true;
				break;
			}
		}
	}

	const stats = {
		stars: totalStarCount, //
		repos: totalRepoCount,
		maxFetchedRepos: maxFetchedRepoCount,
		...(BREAK_IF_ENCOUNTERED_ZERO_STARS_SINCE_SORTED ? { brokeEarlyBecauseFoundZeroStars } : {}),
	};

	console.log({ stats });

	const repos = getFlatRepos(pages);

	const meta = {
		login,
		startTime,
	};

	return {
		meta,
		stats, //
		repos,
	};
}

const readfileSync = (file, opts = {}) =>
	require("fs")
		.readFileSync(file, { encoding: "utf-8", ...opts })
		.trim();

const sum = (acc, curr) => acc + curr;

const QUERY_USER_REPOS_STARS = gql`
	query ($login: String!, $first: Int!, $after: String) {
		user(login: $login) {
			repositories(
				first: $first
				after: $after
				ownerAffiliations: OWNER
				orderBy: { direction: DESC, field: STARGAZERS }
			) {
				totalCount
				edges {
					cursor
					node {
						name
						id
						stargazers {
							totalCount
						}
					}
				}
			}
		}
	}
`;

function gql(x) {
	return x[0];
}

const getFlatRepos = (pages) => pages.flatMap(getFlatReposEdges);
const getFlatReposEdges = (page) => page.data.user.repositories.edges;

async function github_star_count_CLI(argv = process.argv.slice(2)) {
	const fs = require("fs");
	const path = require("path");

	const data = await fetchStarsOfUserRepos();

	const outDirBase = path.join(__dirname, "out"); // TODO ARGV
	const outDir = path.join(outDirBase, data.meta.login);
	ensureDirSync(outDir, fs);
	const outfile = path.join(outDir, data.meta.startTime + ".json");

	fs.writeFileSync(outfile, JSON.stringify(data, null, 2), { encoding: "utf-8" });

	process.stdout.write(outfile + "\n");
	return outfile;
}

function ensureDirSync(dir, fs = require("fs")) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

if (!module.parent) {
	github_star_count_CLI()
		.then(() => {
			process.exit(0);
		})
		.catch((e) => {
			console.error(e);
			process.exit(1);
		});
}

module.exports = {
	fetchStarsOfUserRepos,
	getFlatRepos,
	getFlatReposEdges,
	github_star_count_CLI,
};
