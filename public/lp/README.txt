LP用の画像置き場です。ChatGPTで生成した画像を、次の名前で置いてください。
（置くまでは、LP上にダッシュ枠のプレースホルダが表示されます）

■ 配置済み
  hero.png    4:3    投函ポストに書類がすべり込む絵
                     ※原本(assets/lp/hero.png)は16:9。左側は見出しを載せる想定の
                       余白なので、右側を4:3で切り出したものを置いている。
  pain.png    4:3    紙が散らばった事務机
  search.png  4:3    3段の引き出し
  mobile.png  3:2    レシートをスマホで撮影
  story.png   3:2    小さなNPO事務所の風景

■ 自動生成（手で置かない）
  ogp.png     1200x630  npm run ogp … hero＋ロゴから合成

  shot-post.png / shot-review.png / shot-months.png  … 使い方3ステップで使用
  shot-search.png                                    … 予備（現在は未使用）
                                     ※ shot-* は npm run shots で撮り直せる

■ まだ未配置（無くても公開できる。未配置の枠は本番では表示されない）
  shelf.png   4:3    12マスの棚（最終CTA・濃色セクション）
  secure.png  1:1    リボンで結ばれた書類の束

プロンプトは docs/LP構成_画像プロンプト.md にあります。

※ ここに置く画像は、生成された原本を assets/lp/ に残したうえで、
   sharp で圧縮したものを置いています（配信は next/image が更に最適化）。
