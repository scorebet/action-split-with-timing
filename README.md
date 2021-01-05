<p align="center">
  <a href="https://github.com/scorebet/action-split-with-timing/actions"><img alt="javscript-action status" src="https://github.com/scorebet/action-split-with-timing/workflows/units-test/badge.svg"></a>
</p>

# Split with timings for unit tests

Generates splits for gradle unit tests into chunks in addition it will also create timings based on the previous test results.

## Usage


### Pre-requisites
Create a workflow `.yml` file in your repositories `.github/workflows` directory. An [example workflow](#example-workflow) is available below. For more information, reference the GitHub Help Documentation for [Creating a workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file).

### Inputs
`test-path`
* **Required** Path of the unit test files of the project located.

`node-index`
* **Required** Node index of the job matrix. The parent job must use [matrix](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstrategymatrix) to enable parallel jobs.

`node-total` 
* **Required** Node total of the job matrix. The parent job must use [matrix](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstrategymatrix) to enable parallel jobs.

`test-result-path`
* Path of the previous test results to enable timings for tests. When test results is missing it will default to split without timings.

`test-exclude`
* List of file names to exclude from the unit test files of the project.

### Outputs

`tests`
* Tests to be run within gradle. This is appended as part of the unit test gradle task.

### Example workflow

```yaml
name: Test split with timings

on: push

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      test-matrix: ${{ steps.create-matrix.outputs.matrix }}
    steps:
      - name: Setup test matrix output
        id: create-matrix
        run: |
          // Creates 2 parallel jobs in the ap module
          MATRIX="{\"include\":[                             \
             {\"module\":\"app\",\"node-total\":2,\"node-index\":0},
             {\"module\":\"app\",\"node-total\":2,\"node-index\":1}
          ]}"
  test:
    needs: [setup]
    runs-on: ubuntu-20.04
    strategy:
      fail-fast: false
      matrix: ${{ fromJson(needs.setup.outputs.test-matrix) }}
    steps:
      - uses: actions/checkout@v2
      - name: Setup cache for Test Results
        uses: scorebet/action-readonly-cache@v2.2.0
        with:
          path: test-results/
          key: cache-test-result-key
          restore-keys: |
            cache-test-result-restore-key
      - name: Create Test ${{ matrix.module }}
        id: action-splitter
        uses: scorebet/action-split-with-timing@v1.0.1
        with:
          test-path: ${{ matrix.module }}/src/test
          node-index: ${{ matrix.node-index }}
          node-total: ${{ matrix.node-total }}
          test-result-path: test-results/${{ matrix.module }}-*
          test-exclude: |
            ExcludeTestSample- name: Run Test ${{ matrix.module }}
        run: |
          ./gradlew :${{ matrix.module }}:testUnitTest ${{ steps.action-splitter.outputs.tests }}      
```

## License
The scripts and documentation in this project are released under the [MIT License](LICENSE)
