"""Import XGBoost with a clear message if its OpenMP runtime is missing (macOS)."""
try:
    import xgboost  # noqa: F401
except Exception as err:  # XGBoostError subclasses Exception
    raise ImportError(
        "XGBoost could not load. On macOS run ./scripts/fix_xgboost_macos.sh once "
        "(it points XGBoost at scikit-learn's bundled OpenMP library)."
    ) from err
