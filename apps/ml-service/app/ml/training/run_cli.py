"""
CLI to run the training pipeline (local or CI). Epic 5.1, 5.4.
Usage: python -m app.ml.training.run_cli [--tenant-id TENANT] [--version VERSION]
With --tenant-id and without --no-data, loads sales from DB for that tenant.
"""
import argparse
import asyncio
import sys

from app.ml.training.pipeline import run_training_pipeline
from app.ml.training.tenant_pipeline import run_tenant_training
from app.ml.training.sales_loader import load_sales_with_db_init


def main() -> int:
    parser = argparse.ArgumentParser(description="Run ML training pipeline (baseline)")
    parser.add_argument("--tenant-id", default=None, help="Tenant ID for isolation")
    parser.add_argument("--version", default=None, help="Model version (default: timestamp)")
    parser.add_argument("--no-data", action="store_true", help="Train default baseline without sales data")
    args = parser.parse_args()

    if args.no_data:
        sales_data = None
    elif args.tenant_id:
        sales_data = asyncio.run(load_sales_with_db_init(args.tenant_id))
    else:
        import logging
        logging.getLogger("bmad.ml").warning(
            "No --tenant-id: cannot load sales from DB. Training with default baseline. "
            "Use --no-data to suppress this warning."
        )
        sales_data = None

    if args.tenant_id and sales_data is not None and len(sales_data) > 0:
        model, version = run_tenant_training(
            tenant_id=args.tenant_id,
            sales_data=sales_data,
            model_version=args.version,
        )
    else:
        model, version = run_training_pipeline(
            tenant_id=args.tenant_id,
            sales_data=sales_data,
            model_version=args.version,
        )
    print(f"Training complete: version={version}, daily_consumption={model.daily_consumption}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
