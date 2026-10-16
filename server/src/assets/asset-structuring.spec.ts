import { structuringGuidance, StructuringAsset } from './asset-structuring';

const now = new Date('2026-10-16T00:00:00Z');
const land: StructuringAsset = { assetType: 'LAND', status: 'VERIFIED', isEncumbered: false, encumbranceNote: null, valuationDate: new Date('2026-06-01'), valuerName: 'Rahim & Co', intendedUse: 'IJARAH', documentTypes: ['OWNERSHIP', 'VALUATION'] };
const fit = (asset: StructuringAsset, contract: string) => structuringGuidance(asset, now).options.find((option) => option.contract === contract)!;

describe('structuringGuidance', () => {
  it('recommends Ijarah for land, buildings and machinery, with the lessor\'s duties', () => {
    const ijarah = fit(land, 'IJARAH');
    expect(ijarah.fit).toBe('RECOMMENDED');
    expect(ijarah.ownerDuties.join(' ')).toContain('major maintenance');
    expect(fit({ ...land, assetType: 'OTHER' }, 'IJARAH').fit).toBe('POSSIBLE');
  });

  it('recommends Musharakah only when the owner intends it and a recent valuation fixes the contribution', () => {
    expect(fit({ ...land, intendedUse: 'MUSHARAKAH' }, 'MUSHARAKAH').fit).toBe('RECOMMENDED');
    const stale = { ...land, intendedUse: 'MUSHARAKAH', valuationDate: new Date('2024-01-01'), documentTypes: ['OWNERSHIP'] };
    expect(fit(stale, 'MUSHARAKAH').fit).toBe('POSSIBLE');
    expect(fit(stale, 'MUSHARAKAH').needs).toContain('Independent valuation report, under 12 months old');
  });

  it('rules out selling a charged asset and asks for the chargee\'s consent to lease it', () => {
    const charged = { ...land, isEncumbered: true, encumbranceNote: 'Maybank home financing' };
    expect(fit(charged, 'MURABAHAH').fit).toBe('NOT_SUITABLE');
    expect(fit(charged, 'IJARAH').needs).toContain("Chargee's consent to lease");
    expect(structuringGuidance({ ...charged, intendedUse: 'MURABAHAH' }, now).concerns.join(' ')).toContain('not suitable');
  });

  it('marks the guidance provisional until ownership is verified', () => {
    const guidance = structuringGuidance({ ...land, status: 'DRAFT' }, now);
    expect(guidance.concerns[0]).toContain('provisional');
    expect(guidance.options[0].needs).toContain('Verified ownership');
  });
});
