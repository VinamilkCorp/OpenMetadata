# Build ingestion module
1. Install env:
    ```console
    ─$ python3 -m venv venv;
    ─$ . venv/bin/activate; 
    ─$ python -m pip install ingestion/
    ```

2. Install antlr:
    ```console
        ─$ sudo make install_antlr_cli
    ```

3. Run generate:
    ```console
        ─$ make generate
    ```
4. Run build ingestion + airflow-apis:
    ```console
        ─$ make vnm-build
    ```
