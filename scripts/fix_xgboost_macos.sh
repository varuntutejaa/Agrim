#!/bin/sh
# XGBoost on macOS needs the OpenMP runtime (libomp), usually from Homebrew.
# scikit-learn already ships a copy, so this points XGBoost at it instead:
# adds one search path to XGBoost's library inside .venv and re-signs it.
# Run once after installing requirements (again after reinstalling xgboost).
# Linux (and Render) use xgboost-cpu and do not need this.
set -e
cd "$(dirname "$0")/.."
SITE=$(.venv/bin/python -c "import sysconfig; print(sysconfig.get_paths()['purelib'])")
LIB="$SITE/xgboost/lib/libxgboost.dylib"
[ "$(uname)" = "Darwin" ] || { echo "Not macOS: nothing to do."; exit 0; }
[ -f "$SITE/sklearn/.dylibs/libomp.dylib" ] || { echo "scikit-learn's libomp not found; pip install scikit-learn first."; exit 1; }
if otool -l "$LIB" | grep -q "sklearn/.dylibs"; then
  echo "Already fixed."
else
  install_name_tool -add_rpath "@loader_path/../../sklearn/.dylibs" "$LIB"
  codesign --force --sign - "$LIB"
fi
.venv/bin/python -c "import xgboost; print('xgboost', xgboost.__version__, 'OK')"
