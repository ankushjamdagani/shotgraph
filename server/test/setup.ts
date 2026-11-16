import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'studio-unit-'));
process.env.STUDIO_HOME=path.join(root,'registry');
afterAll(async()=>{await fs.rm(root,{recursive:true,force:true});});
