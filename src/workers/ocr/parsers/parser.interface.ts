import { OrdenDireccionamiento } from '../../../common/interfaces/orden-direccionamiento.interface';

export interface IEPSParser {
  epsIdentifier: string;
  canParse(rawText: string): boolean;
  parse(rawText: string): Partial<OrdenDireccionamiento>;
  confidence(result: Partial<OrdenDireccionamiento>): number;
}
