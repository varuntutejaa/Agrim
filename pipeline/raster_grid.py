"""The one raster grid every milestone-2 layer is aligned to.

UTM 43N, 30 m cells, covering config.DEM_BBOX. Because the DEM, land cover
and every derived raster share this grid, a (row, col) means the same place
in all of them.
"""
import math

from pyproj import Transformer
from rasterio.transform import from_origin

from pipeline.config import DEM_BBOX, DEM_RES_M, UTM_CRS

_to_utm = Transformer.from_crs("EPSG:4326", UTM_CRS, always_xy=True)
_to_lonlat = Transformer.from_crs(UTM_CRS, "EPSG:4326", always_xy=True)


def _grid():
    south, west, north, east = DEM_BBOX
    # Project the four corners and take the box that contains them all.
    xs, ys = zip(*(_to_utm.transform(lon, lat) for lon in (west, east) for lat in (south, north)))
    x0 = math.floor(min(xs) / DEM_RES_M) * DEM_RES_M
    y1 = math.ceil(max(ys) / DEM_RES_M) * DEM_RES_M
    width = math.ceil((max(xs) - x0) / DEM_RES_M)
    height = math.ceil((y1 - min(ys)) / DEM_RES_M)
    return from_origin(x0, y1, DEM_RES_M, DEM_RES_M), width, height


TRANSFORM, WIDTH, HEIGHT = _grid()
CRS = UTM_CRS
CELL_AREA_KM2 = (DEM_RES_M / 1000) ** 2


def lonlat_to_rowcol(lon: float, lat: float) -> tuple[int, int]:
    x, y = _to_utm.transform(lon, lat)
    col, row = ~TRANSFORM * (x, y)
    return int(row), int(col)


def rowcol_to_lonlat(row: int, col: int) -> tuple[float, float]:
    """Centre of the cell, as (lon, lat)."""
    x, y = TRANSFORM * (col + 0.5, row + 0.5)
    return _to_lonlat.transform(x, y)


def utm_to_lonlat(x, y):
    return _to_lonlat.transform(x, y)


def profile(dtype="float32", nodata=None) -> dict:
    """rasterio profile for writing a GeoTIFF on this grid."""
    return {"driver": "GTiff", "width": WIDTH, "height": HEIGHT, "count": 1, "dtype": dtype,
            "crs": CRS, "transform": TRANSFORM, "nodata": nodata, "compress": "deflate", "tiled": True}
