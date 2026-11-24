# 新機能実装時は git worktree を使う

新しい feature を実装するときは、必ず専用の git worktree を作成し、その中で作業すること。複数の Claude が並列に動いても、互いの変更や作業ディレクトリが衝突しないようにするため。

## 手順

1. 作業開始前に、`main` から feature ブランチ付きの worktree を作成する。
   - Claude Code の `EnterWorktree` ツールが使える場合はそれを使う。
   - 使えない場合は手動で作成する:
     ```sh
     git worktree add ../paper-magic-worktrees/<feature-name> -b feature/<feature-name> main
     ```
   - `<feature-name>` には Linear のチケット ID を含める（例: `LIN-123-monthly-summary`）。全体の流れは [feature-workflow.md](feature-workflow.md) を参照。
2. 以降の編集・実行・コミットはすべてその worktree の中で行う。メインの作業ツリー（このリポジトリのルート）では feature の作業をしない。
3. 作業が終わったら、ユーザーの指示に従ってマージや PR 作成を行い、不要になった worktree は片付ける:
   ```sh
   git worktree remove ../paper-magic-worktrees/<feature-name>
   ```

## 注意点

- ブランチ名と worktree のディレクトリ名は feature ごとに一意にし、他の Claude が使っているものと重ならないようにする（作成前に `git worktree list` で確認する）。
- 他の worktree のファイルを編集したり、他の Claude が作ったブランチを checkout・削除したりしない。
- 出力ファイルも各 worktree の中に書き出し、共有パスへの同時書き込みを避ける。
- 質問への回答やデータの読み取りだけで、ファイルを変更しない作業には worktree は不要。
