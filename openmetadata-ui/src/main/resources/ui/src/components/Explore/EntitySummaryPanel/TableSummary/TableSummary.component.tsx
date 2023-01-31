/*
 *  Copyright 2022 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { Col, Divider, Row, Typography } from 'antd';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import SummaryTagsDescription from 'components/common/SummaryTagsDescription/SummaryTagsDescription.component';
import { ExplorePageTabs } from 'enums/Explore.enum';
import { isEmpty, isUndefined } from 'lodash';
import {
  default as React,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  getLatestTableProfileByFqn,
  getTableQueryByTableId,
} from 'rest/tableAPI';
import { getListTestCase } from 'rest/testAPI';
import {
  DRAWER_NAVIGATION_OPTIONS,
  getEntityOverview,
} from 'utils/EntityUtils';
import { API_RES_MAX_SIZE } from '../../../../constants/constants';
import { INITIAL_TEST_RESULT_SUMMARY } from '../../../../constants/profiler.constant';
import { SummaryEntityType } from '../../../../enums/EntitySummary.enum';
import { SearchIndex } from '../../../../enums/search.enum';
import { Table } from '../../../../generated/entity/data/table';
import { Include } from '../../../../generated/type/include';
import {
  formatNumberWithComma,
  formTwoDigitNmber as formTwoDigitNumber,
} from '../../../../utils/CommonUtils';
import { updateTestResults } from '../../../../utils/DataQualityAndProfilerUtils';
import { getFormattedEntityData } from '../../../../utils/EntitySummaryPanelUtils';
import { generateEntityLink } from '../../../../utils/TableUtils';
import { showErrorToast } from '../../../../utils/ToastUtils';
import TableDataCardTitle from '../../../common/table-data-card-v2/TableDataCardTitle.component';
import {
  OverallTableSummeryType,
  TableTestsType,
} from '../../../TableProfiler/TableProfiler.interface';
import SummaryList from '../SummaryList/SummaryList.component';
import { BasicEntityInfo } from '../SummaryList/SummaryList.interface';
import { TableSummaryProps } from './TableSummary.interface';

function TableSummary({
  entityDetails,
  componentType = DRAWER_NAVIGATION_OPTIONS.explore,
  tags,
}: TableSummaryProps) {
  const { t } = useTranslation();
  const [tableDetails, setTableDetails] = useState<Table>(entityDetails);
  const [tableTests, setTableTests] = useState<TableTestsType>({
    tests: [],
    results: INITIAL_TEST_RESULT_SUMMARY,
  });

  const isExplore = useMemo(
    () => componentType === DRAWER_NAVIGATION_OPTIONS.explore,
    [componentType]
  );

  const isTableDeleted = useMemo(() => entityDetails.deleted, [entityDetails]);

  const fetchAllTests = async () => {
    try {
      const { data } = await getListTestCase({
        fields: 'testCaseResult,entityLink,testDefinition,testSuite',
        entityLink: generateEntityLink(entityDetails?.fullyQualifiedName || ''),
        includeAllTests: true,
        limit: API_RES_MAX_SIZE,
        include: Include.Deleted,
      });
      const tableTests: TableTestsType = {
        tests: [],
        results: { ...INITIAL_TEST_RESULT_SUMMARY },
      };
      data.forEach((test) => {
        if (test.entityFQN === entityDetails?.fullyQualifiedName) {
          tableTests.tests.push(test);

          updateTestResults(
            tableTests.results,
            test.testCaseResult?.testCaseStatus || ''
          );
        }
      });
      setTableTests(tableTests);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const fetchProfilerData = useCallback(async () => {
    try {
      const profileResponse = await getLatestTableProfileByFqn(
        entityDetails?.fullyQualifiedName || ''
      );

      const { profile } = profileResponse;

      const queriesResponse = await getTableQueryByTableId(
        entityDetails.id || ''
      );

      const { tableQueries } = queriesResponse;

      setTableDetails((prev) => {
        if (prev) {
          return { ...prev, profile, tableQueries };
        } else {
          return {} as Table;
        }
      });
    } catch {
      showErrorToast(
        t('server.entity-details-fetch-error', {
          entityType: t('label.table-lowercase'),
          entityName: entityDetails.name,
        })
      );
    }
  }, [entityDetails, isTableDeleted, fetchAllTests]);

  const overallSummary: OverallTableSummeryType[] | undefined = useMemo(() => {
    if (isUndefined(tableDetails.profile)) {
      return undefined;
    }

    return [
      {
        title: t('label.row-count'),
        value: formatNumberWithComma(tableDetails?.profile?.rowCount ?? 0),
      },
      {
        title: t('label.column-entity', {
          entity: t('label.count'),
        }),
        value:
          tableDetails?.profile?.columnCount ?? entityDetails.columns.length,
      },
      {
        title: `${t('label.table-entity-text', {
          entityText: t('label.sample'),
        })} %`,
        value: `${tableDetails?.profile?.profileSample ?? 100}%`,
      },
      {
        title: `${t('label.test-plural')} ${t('label.passed')}`,
        value: formTwoDigitNumber(tableTests.results.success),
        className: 'success',
      },
      {
        title: `${t('label.test-plural')} ${t('label.aborted')}`,
        value: formTwoDigitNumber(tableTests.results.aborted),
        className: 'aborted',
      },
      {
        title: `${t('label.test-plural')} ${t('label.failed')}`,
        value: formTwoDigitNumber(tableTests.results.failed),
        className: 'failed',
      },
    ];
  }, [tableDetails, tableTests]);

  const { columns } = tableDetails;

  const entityInfo = useMemo(
    () => getEntityOverview(ExplorePageTabs.TABLES, entityDetails),
    [entityDetails]
  );

  const formattedColumnsData: BasicEntityInfo[] = useMemo(
    () =>
      getFormattedEntityData(
        SummaryEntityType.COLUMN,
        columns,
        tableDetails.tableConstraints
      ),
    [columns, tableDetails]
  );

  useEffect(() => {
    if (!isEmpty(entityDetails)) {
      setTableDetails(entityDetails);
      fetchAllTests();
      !isTableDeleted && fetchProfilerData();
    }
  }, [entityDetails]);

  return (
    <>
      <Row
        className={classNames({
          'm-md': isExplore,
        })}
        gutter={[0, 4]}>
        {isExplore ? (
          <Col span={24}>
            <TableDataCardTitle
              dataTestId="summary-panel-title"
              searchIndex={SearchIndex.TABLE}
              source={tableDetails}
            />
          </Col>
        ) : null}
        <Col span={24}>
          <Row>
            {entityInfo.map((info) =>
              info.visible?.includes(componentType) ? (
                <Col key={info.name} span={24}>
                  <Row gutter={16}>
                    <Col data-testid={`${info.name}-label`} span={10}>
                      <Typography.Text className="text-grey-muted">
                        {info.name}
                      </Typography.Text>
                    </Col>
                    <Col data-testid={`${info.name}-value`} span={12}>
                      {info.isLink ? (
                        <Link
                          component={Typography.Link}
                          target={info.isExternal ? '_blank' : '_self'}
                          to={{ pathname: info.url }}>
                          {info.value}
                        </Link>
                      ) : (
                        info.value
                      )}
                    </Col>
                  </Row>
                </Col>
              ) : null
            )}
          </Row>
        </Col>
      </Row>

      <Divider className="m-y-xs" />

      {!isExplore ? (
        <>
          <SummaryTagsDescription
            entityDetail={entityDetails}
            tags={tags ? tags : []}
          />
          <Divider className="m-y-xs" />
        </>
      ) : null}

      <Row
        className={classNames({
          'm-md': isExplore,
        })}
        gutter={[0, 16]}>
        <Col span={24}>
          <Typography.Text
            className="text-base text-grey-muted"
            data-testid="profiler-header">
            {t('label.profiler-amp-data-quality')}
          </Typography.Text>
        </Col>
        <Col span={24}>
          {isUndefined(overallSummary) ? (
            <Typography.Text data-testid="no-profiler-enabled-message">
              {t('message.no-profiler-enabled-summary-message')}
            </Typography.Text>
          ) : (
            <Row gutter={[16, 16]}>
              {overallSummary.map((field) => (
                <Col key={field.title} span={10}>
                  <Row>
                    <Col span={24}>
                      <Typography.Text
                        className="text-grey-muted"
                        data-testid={`${field.title}-label`}>
                        {field.title}
                      </Typography.Text>
                    </Col>
                    <Col span={24}>
                      <Typography.Text
                        className={classNames(
                          'summary-panel-statistics-count',
                          field.className
                        )}
                        data-testid={`${field.title}-value`}>
                        {field.value}
                      </Typography.Text>
                    </Col>
                  </Row>
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>

      <Divider className="m-y-xs" />

      <Row
        className={classNames({
          'm-md': isExplore,
        })}
        gutter={[0, 16]}>
        <Col span={24}>
          <Typography.Text
            className="text-base text-grey-muted"
            data-testid="schema-header">
            {t('label.schema')}
          </Typography.Text>
        </Col>
        <Col span={24}>
          <SummaryList
            entityType={SummaryEntityType.COLUMN}
            formattedEntityData={formattedColumnsData}
          />
        </Col>
      </Row>
    </>
  );
}

export default TableSummary;
