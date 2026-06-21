import type { CircuitState } from '../types/circuit';
import { serializeBoard } from './serializeBoard';
import * as nbt from 'prismarine-nbt';
import pako from 'pako';
import JSZip from 'jszip';

/**
 * NBT Compiler — Stub implementation.
 *
 * Converts a CircuitState into the palette + blocks structure needed for
 * a Minecraft .nbt schematic file. The actual binary serialization using
 * prismarine-nbt will be completed once the user provides the exact
 * export format details.
 *
 * Current output: JSON representation of the NBT structure.
 */

/** A palette entry in the NBT schematic */
interface PaletteEntry {
    Name: string;
    Properties?: Record<string, string>;
}

/** A block entry in the NBT schematic */
interface BlockEntry {
    pos: [number, number, number];
    state: number; // index into palette
    nbt?: Record<string, unknown>;
}

/** The compiled NBT structure (JSON representation) */
export interface NbtStructure {
    size: [number, number, number];
    palette: PaletteEntry[];
    blocks: BlockEntry[];
    DataVersion: number;
}

/**
 * Compile a CircuitState into an NBT-ready structure.
 * Maps each component to a palette entry + block positions.
 */
export function compileToNbtStructure(state: CircuitState, boardX = 0, boardY = 0): any {
    // 1. Filter components strictly within this specific 16x16 board
    const boardComponents = state.components.filter(c =>
        c.position.x >= boardX * 16 && c.position.x < (boardX + 1) * 16 &&
        c.position.y >= boardY * 16 && c.position.y < (boardY + 1) * 16
    );

    // 2. Filter wires strictly within this specific 16x16 board
    const boardWires = state.wireCells.filter(w =>
        w.x >= boardX * 16 && w.x < (boardX + 1) * 16 &&
        w.y >= boardY * 16 && w.y < (boardY + 1) * 16
    );

    const boardTag = serializeBoard(boardComponents, boardWires, boardX, boardY);
    boardTag.value.Name = nbt.string(`PowerGrid Board ${boardX},${boardY}`);
    return boardTag;
}

/**
 * Export the NBT structure as a downloadable binary .nbt file.
 */
export async function downloadNbtBinary(state: CircuitState, filename = 'circuit_board.nbt') {
    try {
        const rootTag = compileToNbtStructure(state);

        // Bypass restrictive inner typings which expect root names on nameless schematic roots
        const buffer = nbt.writeUncompressed(rootTag as any);

        // Minecraft requires .nbt schematic files to be structurally GZIP compressed
        const compressedUint8Array = pako.gzip(new Uint8Array(buffer));

        const blob = new Blob([compressedUint8Array], { type: 'application/x-gzip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return true; // Success
    } catch (error) {
        console.error("Failed to compile NBT binary:", error);
        throw error;
    }
}

export async function downloadMultiTileZip(state: CircuitState, tilesX: number, tilesY: number) {
    const zip = new JSZip();

    for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
            // Generate the NBT for this specific X/Y tile
            const rootTag = compileToNbtStructure(state, x, y);
            const buffer = nbt.writeUncompressed(rootTag as any);
            const compressed = pako.gzip(new Uint8Array(buffer));

            // Add it to the ZIP archive
            zip.file(`board_${x}_${y}.nbt`, compressed);
        }
    }

    // Generate and download the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'powergrid_multi_board.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}