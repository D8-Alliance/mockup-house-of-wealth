import { firstProhibitedTerm, normaliseCountryTerms, prohibitedActivities } from './prohibited-activities';

describe('prohibited activities', () => {
  it('finds the categories a description suggests, in English and Malay', () => {
    expect(prohibitedActivities('Cafe and karaoke lounge')).toEqual(['adult entertainment']);
    expect(prohibitedActivities('Kedai judi dan arak')).toEqual(['alcohol', 'gambling']);
    expect(prohibitedActivities('Pawn-shop and money changer')).toEqual(['conventional finance (riba)']);
    expect(prohibitedActivities('Halal bakery and catering')).toEqual([]);
  });

  it('matches whole words only', () => {
    expect(prohibitedActivities('Barley farm and publishing house')).toEqual([]);
    expect(prohibitedActivities('Sports bar')).toEqual(['alcohol']);
  });

  it('adds the country\'s own words', () => {
    expect(prohibitedActivities('Shisha lounge', ['shisha'])).toEqual(['shisha']);
    expect(prohibitedActivities('Shisha lounge')).toEqual([]);
    expect(firstProhibitedTerm('Shisha lounge', ['Shisha'])).toBe('Shisha');
    expect(firstProhibitedTerm('A Brewery tour')).toBe('Brewery');
  });

  it('cleans the country list', () => {
    expect(normaliseCountryTerms([' Shisha ', 'shisha', '', 'x', 'Tarot reading'])).toEqual(['shisha', 'tarot reading']);
  });
});
