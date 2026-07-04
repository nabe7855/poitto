import { PageHeader } from "@/components/ui/page-header";
import { Dropzone } from "@/components/post/dropzone";

export const metadata = { title: "投函" };

export default function PostPage() {
  return (
    <>
      <PageHeader
        title="投函"
        description="請求書・領収書を入れるだけ。AIが名前を付けて保存します。"
      />
      <Dropzone />
    </>
  );
}
