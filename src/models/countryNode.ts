export * from '../countryNodes/countryNodeTypes';
import { CountryNode as BaseCountryNode } from '../countryNodes/countryNodeTypes';

// Backward compatibility interface
export interface LegacyCountryNode extends BaseCountryNode {
  id: string;
  code: string;
  name: string;
  centralBankApproval?: boolean;
  regulatoryBody?: string;
}
