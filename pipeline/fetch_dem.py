"""Download the Copernicus 30 m DEM for the terrain box and put it on our grid.

Run from the repo root:
    python -m pipeline.fetch_dem

Source: Copernicus DEM GLO-30, read directly from the public AWS bucket
(no account or key). Ported from JalNetra's pipeline/dem.py.
Writes data/dem/dem_utm30.tif (UTM 43N, 30 m).

Caveat: Copernicus GLO-30 is a *surface* model (it sees roofs and tree
tops, not bare ground). In dense built-up areas that adds noise to flow
directions; burning OSM drains into it (build_network.py) offsets part of that.
"""
import math

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT

from pipeline import raster_grid as g
from pipeline.config import DEM_BBOX, DEM_DIR, DEM_TIF

TILE_URL = ("https://copernicus-dem-30m.s3.amazonaws.com/"
            "Copernicus_DSM_COG_10_{tile}_00_DEM/Copernicus_DSM_COG_10_{tile}_00_DEM.tif")


def tiles_for_bbox(bbox=DEM_BBOX) -> list[str]:
    """1x1 degree tile names, e.g. N28_00_E076, that cover the box."""
    south, west, north, east = bbox
    return [f"N{lat:02d}_00_E{lon:03d}"
            for lat in range(math.floor(south), math.floor(north) + 1)
            for lon in range(math.floor(west), math.floor(east) + 1)]


def main():
    DEM_DIR.mkdir(parents=True, exist_ok=True)
    out = np.full((g.HEIGHT, g.WIDTH), np.nan, np.float32)
    for tile in tiles_for_bbox():
        url = TILE_URL.format(tile=tile)
        print(f"Reading {tile} ...", flush=True)
        # WarpedVRT reprojects on the fly; only the needed part of the
        # cloud-optimised GeoTIFF is downloaded.
        with rasterio.open(url) as src, WarpedVRT(
            src, crs=g.CRS, transform=g.TRANSFORM, width=g.WIDTH, height=g.HEIGHT,
            resampling=Resampling.bilinear, nodata=np.nan, dtype="float32",
        ) as vrt:
            part = vrt.read(1)
        fill = np.isnan(out) & np.isfinite(part)
        out[fill] = part[fill]

    missing = np.isnan(out).mean()
    if missing > 0:
        raise SystemExit(f"{missing:.1%} of the grid has no elevation; check the tile list.")
    with rasterio.open(DEM_TIF, "w", **g.profile("float32", nodata=np.nan)) as dst:
        dst.write(out, 1)
    print(f"Wrote {DEM_TIF}: {g.WIDTH} x {g.HEIGHT} cells, "
          f"elevation {np.nanmin(out):.0f}-{np.nanmax(out):.0f} m")


if __name__ == "__main__":
    main()
