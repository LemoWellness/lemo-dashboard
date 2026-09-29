import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { authedFetch } from '../../lib/firebaseClient';
import {
  STATUSES, MODELS, SOURCES, LINE_STATUSES, RISK_LEVELS, RISK_STATUSES,
  applySourceLines, compute, emptyAssessment, isMallModel, MALL_MODEL, normalizeLogistics,
} from '../../lib/riskMath';
