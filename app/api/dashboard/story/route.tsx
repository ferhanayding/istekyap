import { ImageResponse } from "next/og";
import { requireUser } from "@/lib/auth";
import { STORY_SIZE, StoryImage, prepareStory } from "@/lib/story";

// Gecenin Instagram kartı (dashboard → Sistem ya da İstatistik). Çizim lib/story.tsx'te.
export async function GET() {
    if (!(await requireUser())) {
        return Response.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    let data: Awaited<ReturnType<typeof prepareStory>>;
    try {
        data = await prepareStory();
    } catch (e) {
        console.error(e);
        return Response.json({ error: "Kart hazırlanamadı." }, { status: 500 });
    }

    return new ImageResponse(<StoryImage {...data.view} />, {
        ...STORY_SIZE,
        fonts: data.fonts,
        headers: {
            "Cache-Control": "no-store",
            "Content-Disposition": `inline; filename="${data.fileName}"`,
        },
    });
}
