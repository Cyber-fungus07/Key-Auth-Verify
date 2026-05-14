import pandas as pd
import numpy as np

CSV_PATH = "/Users/ayushmishra06/Desktop/keystroke-auth/fast-api/bio_bio.csv"
FEATURE_COUNT = 97

try:
    df = pd.read_csv(CSV_PATH, keep_default_na=False)
    print(f"Loaded CSV with {len(df)} rows and {len(df.columns)} columns.")
    
    X_raw = df.iloc[:, :FEATURE_COUNT]
    
    for i, row in X_raw.iterrows():
        for j, val in enumerate(row):
            try:
                float(val)
            except ValueError:
                print(f"Row {i}, Column {j} (Header: {X_raw.columns[j]}) is not a float: '{val}'")
                print(f"Full row {i}: {list(row)}")
                break
except Exception as e:
    print(f"Error: {e}")
