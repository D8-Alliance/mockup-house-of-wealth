import { isRelatedParty, normaliseGroupName, officialGroupName } from './organisation-group';

describe('organisation group', () => {
  it('compares group names without case, spacing or a trailing Group/Berhad', () => {
    expect(normaliseGroupName('  FELDA   Group ')).toBe('felda');
    expect(normaliseGroupName('Felda Berhad')).toBe('felda');
    expect(normaliseGroupName(null)).toBe('');
  });

  it('marks two different organisations of the same group as related', () => {
    expect(isRelatedParty({ id: 'ORG-1', groupName: 'FELDA Group' }, { id: 'ORG-2', groupName: 'felda' })).toBe(true);
    expect(isRelatedParty({ id: 'ORG-1', groupName: 'FELDA Group' }, { id: 'ORG-2', groupName: 'Sime Darby' })).toBe(false);
  });

  it('never matches without a group, or the same organisation', () => {
    expect(isRelatedParty({ id: 'ORG-1', groupName: null }, { id: 'ORG-2', groupName: null })).toBe(false);
    expect(isRelatedParty({ id: 'ORG-1', groupName: 'Group' }, { id: 'ORG-2', groupName: 'Group' })).toBe(false);
    expect(isRelatedParty({ id: 'ORG-1', groupName: 'FELDA' }, { id: 'ORG-1', groupName: 'FELDA' })).toBe(false);
    expect(isRelatedParty(null, { id: 'ORG-2', groupName: 'FELDA' })).toBe(false);
  });
});

describe('official group names', () => {
  const groups = [{ name: 'FELDA Group', aliases: ['Felda Global Ventures', 'FGV'] }, { name: 'Al Hidayah Group', aliases: [] }];

  it('gives the official name for the name itself or any other spelling', () => {
    expect(officialGroupName('felda', groups)).toBe('FELDA Group');
    expect(officialGroupName('FGV Holdings Berhad', groups)).toBeNull();
    expect(officialGroupName('FGV', groups)).toBe('FELDA Group');
    expect(officialGroupName('Felda Global Ventures Bhd', groups)).toBe('FELDA Group');
    expect(officialGroupName('AL-HIDAYAH group', groups)).toBe('Al Hidayah Group');
  });

  it('returns nothing for an unknown or empty name', () => {
    expect(officialGroupName('Sime Darby', groups)).toBeNull();
    expect(officialGroupName('', groups)).toBeNull();
    expect(officialGroupName(null, groups)).toBeNull();
  });
});
