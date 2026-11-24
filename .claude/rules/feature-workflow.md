# 新機能実装のワークフロー（Linear チケットベース）

新しい feature の実装は、すべて Linear のチケット単位で管理する。以下の順番で進め、ステップを飛ばさないこと。

## 1. Linear にチケットを作成する（実装前）

- 実装に着手する前に、Linear MCP（`mcp__linear-server__*`）でチケットを作成する。
- 作成前に `list_issues` で同じ内容のチケットがないか確認し、重複を避ける。既存チケットがあればそれを使う。
- チケットには、目的・やること・完了条件を簡潔に書く。
- 作業を始めたらチケットのステータスを「In Progress」相当に更新する。

## 2. worktree を作成して実装する

- [worktree.md](worktree.md) のルールに従い、専用の worktree で作業する。
- ブランチ名にはチケット ID を含める（例: `feature/LIN-123-monthly-summary`）。
- コミットメッセージにもチケット ID を含める。

## 3. subagent でコードレビューを行う（実装完了後）

- 実装が終わったら、Agent ツールでレビュー用 subagent を起動し、差分（`main` との diff）をレビューさせる。
  - React / Next.js / JavaScript / TypeScript のコードなら `frontend-code-reviewer` を使う。
  - それ以外（Python スクリプトなど）は `general-purpose` に、正しさ・保守性・セキュリティの観点でレビューさせる。
- 指摘があれば修正し、再度レビューを受ける。OK が出るまで次へ進まない。
- レビュー結果の要約を Linear チケットにコメントとして残す。

## 4. PR を作成してマージする（レビュー OK 後）

- feature ブランチを push し、`gh pr create` で `main` 向けの PR を作成する。
  - PR のタイトル・本文にチケット ID とレビュー結果の要約を含める。
- PR をマージして `main` に反映する（`gh pr merge`）。
- マージ後:
  - Linear チケットを「Done」相当に更新し、PR の URL をコメントまたは添付で残す。
  - [worktree.md](worktree.md) の手順で worktree を片付け、マージ済みのブランチを削除する。
