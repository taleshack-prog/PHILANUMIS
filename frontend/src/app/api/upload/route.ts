import { NextRequest, NextResponse } from "next/server";
import { PinataSDK } from "pinata";

/// Roda só no servidor — o PINATA_JWT nunca é exposto ao navegador (por isso NÃO tem prefixo
/// NEXT_PUBLIC_). Se o navegador chamasse a Pinata direto, a chave ficaria visível no bundle JS
/// pra qualquer visitante do site.
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY ?? "gateway.pinata.cloud",
});

export async function POST(req: NextRequest) {
  if (!process.env.PINATA_JWT) {
    return NextResponse.json(
      { error: "PINATA_JWT não configurado no .env do servidor. Veja README para criar uma conta gratuita." },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;

    if (!image || !name) {
      return NextResponse.json({ error: "Imagem e nome são obrigatórios." }, { status: 400 });
    }

    // 1) Sobe a imagem
    const imageUpload = await pinata.upload.public.file(image);
    const imageURI = `ipfs://${imageUpload.cid}`;

    // 2) Monta e sobe o metadata JSON (padrão parecido com ERC-1155 metadata, mas os campos que
    //    o contrato realmente usa são só o que o front lê de volta — ver useAsset.ts)
    const metadata = {
      name,
      description: description ?? "",
      image: imageURI,
    };
    const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" });
    const metadataUpload = await pinata.upload.public.file(metadataFile);
    const metadataURI = `ipfs://${metadataUpload.cid}`;

    return NextResponse.json({ metadataURI, imageURI });
  } catch (err) {
    console.error("[api/upload] erro:", err);
    return NextResponse.json({ error: "Falha no upload para o IPFS. Tente novamente." }, { status: 500 });
  }
}
