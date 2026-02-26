# Changelog

## [7.0.1](https://github.com/npm/write-file-atomic/compare/v7.0.0...v7.0.1) (2026-02-26)
### Bug Fixes
* [`da246ef`](https://github.com/npm/write-file-atomic/commit/da246ef6b911f75c236070193eca823df7b9969f) [#229](https://github.com/npm/write-file-atomic/pull/229) use node:crypto instead of imurmurhash (@owlstronaut)
### Dependencies
* [`727e92c`](https://github.com/npm/write-file-atomic/commit/727e92c836515816e454919b526162490a9a9524) [#229](https://github.com/npm/write-file-atomic/pull/229) remove imurmurhash
### Chores
* [`4785863`](https://github.com/npm/write-file-atomic/commit/47858631168a63da5415c57d3538cb567d9b6035) [#221](https://github.com/npm/write-file-atomic/pull/221) bump @npmcli/eslint-config from 5.1.0 to 6.0.0 (#221) (@dependabot[bot])
* [`0c819a3`](https://github.com/npm/write-file-atomic/commit/0c819a347cada1c54065d41410cf683bc60ce3c5) [#223](https://github.com/npm/write-file-atomic/pull/223) bump @npmcli/template-oss from 4.28.0 to 4.28.1 (#223) (@dependabot[bot], @npm-cli-bot)

## [7.0.0](https://github.com/npm/write-file-atomic/compare/v6.0.0...v7.0.0) (2025-10-22)
### ⚠️ BREAKING CHANGES
* `write-file-atomic` now supports node `^20.17.0 || >=22.9.0`
### Bug Fixes
* [`05b67bd`](https://github.com/npm/write-file-atomic/commit/05b67bd54e8c7966619bd07a0d2eaca81261e034) [#219](https://github.com/npm/write-file-atomic/pull/219) align to npm 11 node engine range (#219) (@owlstronaut)
### Chores
* [`52d789d`](https://github.com/npm/write-file-atomic/commit/52d789d21905b83bcb3b93c7cd2750cdc82becc6) [#212](https://github.com/npm/write-file-atomic/pull/212) postinstall workflow updates (#212) (@owlstronaut)
* [`602f2ad`](https://github.com/npm/write-file-atomic/commit/602f2ad71ce4e08357286aa06a2619ce1746f12b) [#218](https://github.com/npm/write-file-atomic/pull/218) bump @npmcli/template-oss from 4.26.0 to 4.27.1 (#218) (@dependabot[bot], @npm-cli-bot)

## [6.0.0](https://github.com/npm/write-file-atomic/compare/v5.0.1...v6.0.0) (2024-09-24)
### ⚠️ BREAKING CHANGES
* `write-file-atomic` now supports node `^18.17.0 || >=20.5.0`
### Bug Fixes
* [`e4db381`](https://github.com/npm/write-file-atomic/commit/e4db381db11ad66e2eba47a801b5fe279923057f) [#208](https://github.com/npm/write-file-atomic/pull/208) align to npm 10 node engine range (@hashtagchris)
### Chores
* [`384ec4c`](https://github.com/npm/write-file-atomic/commit/384ec4c4008cf66b9863999c7b4e0554109968bc) [#208](https://github.com/npm/write-file-atomic/pull/208) run template-oss-apply (@hashtagchris)
* [`1a8883d`](https://github.com/npm/write-file-atomic/commit/1a8883d94a97bef3addf7d77300720f3aacfabbe) [#206](https://github.com/npm/write-file-atomic/pull/206) bump @npmcli/eslint-config from 4.0.5 to 5.0.0 (@dependabot[bot])
* [`73bddd9`](https://github.com/npm/write-file-atomic/commit/73bddd9db182f7a9ec1475a311c57844b4b3f05f) [#194](https://github.com/npm/write-file-atomic/pull/194) linting: no-unused-vars (@lukekarrys)
* [`4a16903`](https://github.com/npm/write-file-atomic/commit/4a169033af04227a898ac14cd90b3358a8d4d37e) [#194](https://github.com/npm/write-file-atomic/pull/194) bump @npmcli/template-oss to 4.22.0 (@lukekarrys)
* [`944e6c2`](https://github.com/npm/write-file-atomic/commit/944e6c2e9d01389514b540e4effa4cc1d786510a) [#207](https://github.com/npm/write-file-atomic/pull/207) postinstall for dependabot template-oss PR (@hashtagchris)
* [`c2c17b7`](https://github.com/npm/write-file-atomic/commit/c2c17b7a9297215cde6bb3c80691563193b986d3) [#207](https://github.com/npm/write-file-atomic/pull/207) bump @npmcli/template-oss from 4.23.1 to 4.23.3 (@dependabot[bot])

## [5.0.1](https://github.com/npm/write-file-atomic/compare/v5.0.0...v5.0.1) (2023-04-26)

### Dependencies

* [`a0daf64`](https://github.com/npm/write-file-atomic/commit/a0daf642b441f3026de36f8d10dae24e46b34f01) [#157](https://github.com/npm/write-file-atomic/pull/157) bump signal-exit from 3.0.7 to 4.0.1 (#157)

## [5.0.0](https://github.com/npm/write-file-atomic/compare/v4.0.2...v5.0.0) (2022-10-10)

### ⚠️ BREAKING CHANGES

* `write-file-atomic` is now compatible with the following semver range for node: `^14.17.0 || ^16.13.0 || >=18.0.0`

### Features

* [`5506c07`](https://github.com/npm/write-file-atomic/commit/5506c076c0421ef2e4ddfc4ee5ed2be5adc809e7) [#122](https://github.com/npm/write-file-atomic/pull/122) postinstall for dependabot template-oss PR (@lukekarrys)

## [4.0.2](https://github.com/npm/write-file-atomic/compare/v4.0.1...v4.0.2) (2022-08-16)


### Bug Fixes

* linting ([#111](https://github.com/npm/write-file-atomic/issues/111)) ([c8ef004](https://github.com/npm/write-file-atomic/commit/c8ef00406ff21056adae06a9b8186d37031d8a95))

### [4.0.1](https://www.github.com/npm/write-file-atomic/compare/v4.0.0...v4.0.1) (2022-02-09)


### Bug Fixes

* remove dupl check for typed arrays ([#96](https://www.github.com/npm/write-file-atomic/issues/96)) ([81a296d](https://www.github.com/npm/write-file-atomic/commit/81a296df8cbed750bc8b41d2b0d725a6a16361f7))
* remove is-typedarray and typedarray-to-buffer ([625526e](https://www.github.com/npm/write-file-atomic/commit/625526e1f190d2599a267839e995b768cf3f69b6))


### Dependencies

* update signal-exit requirement from ^3.0.2 to ^3.0.7 ([0b3ffdb](https://www.github.com/npm/write-file-atomic/commit/0b3ffdb4534b254ac5de8acf02e5b4591e2d92b4))

## [4.0.0](https://www.github.com/npm/write-file-atomic/compare/v3.0.3...v4.0.0) (2022-01-18)


### ⚠ BREAKING CHANGES

* This drops support for node10 and non-LTS versions of node12 and node14

### Bug Fixes

* move to template-oss ([266833d](https://www.github.com/npm/write-file-atomic/commit/266833d868b7626227d25dfbfa694798770bc811))


### dependencies

* typedarray-to-buffer@4.0.0 ([f36ff4f](https://www.github.com/npm/write-file-atomic/commit/f36ff4f5bc21178885f53768268fd9d8b0ba0729))


### Documentation

* **readme:** clean up API/usage syntax ([#90](https://www.github.com/npm/write-file-atomic/issues/90)) ([22c6990](https://www.github.com/npm/write-file-atomic/commit/22c6990a4ce08ddb3cd7e18837997c0acd81daac))
