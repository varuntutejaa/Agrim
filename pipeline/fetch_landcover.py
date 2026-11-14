"""Built-up share from ESA WorldCover, on our 30 m grid.

Run from the repo root:
    python -m pipeline.fetch_landcover

Source: ESA WorldCover 10 m v200 (2021), read from ESA's public AWS bucket
(no key).

Writes data/landcover/builtup_frac_utm30.tif: for each 30 m cell, the share
(0-1) of its 10 m pixels that WorldCover classes as "built-up" (class 50).
More built-up = more sealed ground = more runoff.
"""
import math

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject
from rasterio.windows import from_bounds

from pipeline import raster_grid as g
from pipeline.config import BUILTUP_TIF, DEM_BBOX, LANDCOVER_DIR

TILE_URL = ("https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/"
            "ESA_WorldCover_10m_2021_v200_{tile}_Map.tif")
BUILT_UP = 50


def tile_name(lat: float, lon: float) -> str:
    """WorldCover tiles are 3x3 degrees, named by their south-west corner."""
    s = math.floor(lat / 3) * 3
    w = math.floor(lon / 3) * 3
    return f"N{s:02d}E{w:03d}"


def main():
    south, west, north, east = DEM_BBOX
    tiles = {tile_name(lat, lon) for lat in (south, north) for lon in (west, east)}
    if len(tiles) != 1:
        raise SystemExit(f"Box spans several WorldCover tiles {tiles}; extend this script to mosaic them.")
    url = TILE_URL.format(tile=tiles.pop())
    print(f"Reading {url} ...", flush=True)

    with rasterio.open(url) as src:
        window = from_bounds(west - 0.01, south - 0.01, east + 0.01, north + 0.01, src.transform)
        classes = src.read(1, window=window)
        src_transform = src.window_transform(window)
        src_crs = src.crs

    built = (classes == BUILT_UP).astype(np.float32)
    out = np.zeros((g.HEIGHT, g.WIDTH), np.float32)
    # Average of the 0/1 pixels inside each 30 m cell = built-up share.
    reproject(built, out, src_transform=src_transform, src_crs=src_crs,
              dst_transform=g.TRANSFORM, dst_crs=g.CRS, resampling=Resampling.average)

    LANDCOVER_DIR.mkdir(parents=True, exist_ok=True)
    with rasterio.open(BUILTUP_TIF, "w", **g.profile("float32")) as dst:
        dst.write(out, 1)
    print(f"Wrote {BUILTUP_TIF}; built-up share over the whole box: {out.mean():.0%}")


if __name__ == "__main__":
    main()
