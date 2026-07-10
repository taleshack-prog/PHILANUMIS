"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { contracts } from "@/lib/contracts";
import { useAdminAssetActions } from "@/lib/hooks/useAdminAssetActions";
import { extractRevertReason } from "@/lib/errors";
import { Card, Input, Textarea, InfoBox } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminAssetsPage() {
  const { createAssetAndGetId, initBondingCurve, listFixedPrice, isPending } = useAdminAssetActions();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Passo 1 — imagem + dados do ativo (a DApp cuida do upload e da criação)
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [totalFractions, setTotalFractions] = useState("1000");

  // Passo 2 — configurar a venda (tokenId é preenchido automaticamente após o passo 1)
  const [tokenId, setTokenId] = useState("");
  const [mode, setMode] = useState<"bonding-curve" | "fixed-price">("bonding-curve");
  const [m, setM] = useState("0.001");
  const [b, setB] = useState("1");
  const [price, setPrice] = useState("25");
  const [cap, setCap] = useState("");

  const { data: mintFeeBps } = useReadContract({ ...contracts.liquidityVault, functionName: "DEFAULT_MINT_FEE_BPS" });
  const { data: marketplaceFeeBps } = useReadContract({
    ...contracts.liquidityVault,
    functionName: "DEFAULT_MARKETPLACE_FEE_BPS",
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleCreate() {
    setError(null);
    setSuccess(null);
    if (!image || !name || !totalFractions) return;

    setUploading(true);
    try {
      // 1) Upload da imagem + metadata pro IPFS (via nossa API route — a chave da Pinata não
      //    fica exposta no navegador)
      const formData = new FormData();
      formData.append("image", image);
      formData.append("name", name);
      formData.append("description", description);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no upload.");

      // 2) Cria o ativo on-chain com a URI que acabou de voltar do IPFS, e já descobre o tokenId
      const newTokenId = await createAssetAndGetId(data.metadataURI, BigInt(totalFractions));

      setTokenId(newTokenId.toString());
      setSuccess(
        `Ativo #${newTokenId.toString()} criado com imagem no IPFS (${data.imageURI}). Configure a venda abaixo.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : extractRevertReason(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleConfigureSale() {
    setError(null);
    setSuccess(null);
    try {
      if (mode === "bonding-curve") {
        await initBondingCurve(BigInt(tokenId), m, b, mintFeeBps as bigint, marketplaceFeeBps as bigint, cap);
      } else {
        await listFixedPrice(BigInt(tokenId), price, mintFeeBps as bigint, cap);
      }
      setSuccess(`Ativo #${tokenId} configurado e à venda.`);
    } catch (err) {
      setError(extractRevertReason(err));
    }
  }

  const busy = uploading || isPending;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Tokenização</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Suba a foto, preencha os dados e crie o ativo — a DApp cuida do upload pro IPFS e do
          registro on-chain. Depois, configure a modalidade de venda.
        </p>
      </div>

      <Card>
        <span className="font-mono text-xs uppercase tracking-wide text-circuit">1. Criar ativo</span>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Foto do item (laudo/perícia)
            <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-ink-dim" />
          </label>

          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Pré-visualização" className="h-40 w-40 rounded-md object-cover" />
          )}

          <label className="flex flex-col gap-1 text-sm text-ink">
            Nome do item
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="1 Real 1943, bronze" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            Descrição
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            Total de frações
            <Input value={totalFractions} onChange={(e) => setTotalFractions(e.target.value)} />
          </label>
          <Button onClick={handleCreate} disabled={busy || !image || !name}>
            {uploading ? "Subindo pro IPFS…" : isPending ? "Confirmando…" : "Criar ativo"}
          </Button>
        </div>
      </Card>

      <Card>
        <span className="font-mono text-xs uppercase tracking-wide text-circuit">2. Configurar venda</span>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Token ID (preenchido automaticamente após o passo 1)
            <Input value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="ex: 2" />
          </label>

          <div className="flex gap-2">
            <Button
              variant={mode === "bonding-curve" ? "primary" : "secondary"}
              onClick={() => setMode("bonding-curve")}
              className="flex-1"
            >
              Bonding curve
            </Button>
            <Button
              variant={mode === "fixed-price" ? "primary" : "secondary"}
              onClick={() => setMode("fixed-price")}
              className="flex-1"
            >
              Preço fixo
            </Button>
          </div>

          {mode === "bonding-curve" ? (
            <>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Inclinação (m) — USDC por fração²
                <Input value={m} onChange={(e) => setM(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Preço base (b) — USDC
                <Input value={b} onChange={(e) => setB(e.target.value)} />
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-1 text-sm text-ink">
              Preço por fração (USDC) — definido pela perícia
              <Input value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-ink">
            Teto de captação (USDC) — vazio = sem teto (só testnet)
            <Input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="ex: 25000" />
          </label>

          <Button onClick={handleConfigureSale} disabled={busy || !tokenId}>
            {isPending ? "Confirmando…" : "Configurar venda"}
          </Button>
        </div>
      </Card>

      {success && <InfoBox tone="success">{success}</InfoBox>}
      {error && <InfoBox tone="danger">{error}</InfoBox>}
    </div>
  );
}
