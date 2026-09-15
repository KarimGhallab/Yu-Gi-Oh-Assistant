import { HexColor, identifyColor } from '@template-monorepo/color';
import { convertToUnix } from '@template-monorepo/utils';

const redHexColor = `#FF0000`;
const identifiedColor: HexColor = identifyColor(redHexColor);
console.log(identifiedColor);

const windowPath = 'C:\\pathDD\\to\\file';
const unixPath = convertToUnix(windowPath);
console.log('Windows path:', windowPath);
console.log('Unix path:', unixPath);
