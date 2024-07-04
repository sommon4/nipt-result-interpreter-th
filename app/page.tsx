'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

const baseRiskData: Record<number, Record<string, number>> = {
  20: {t21: 1100, t18: 2500, t13: 7800},
  25: {t21: 1000, t18: 2200, t13: 7000},
  30: {t21: 650, t18: 1500, t13: 4600},
  31: {t21: 550, t18: 1300, t13: 4000},
  32: {t21: 450, t18: 1100, t13: 3400},
  33: {t21: 400, t18: 900, t13: 2800},
  34: {t21: 300, t18: 700, t13: 2300},
  35: {t21: 250, t18: 600, t13: 1800},
  36: {t21: 200, t18: 450, t13: 1400},
  37: {t21: 150, t18: 350, t13: 1100},
  38: {t21: 120, t18: 270, t13: 860},
  39: {t21: 90, t18: 210, t13: 650},
  40: {t21: 70, t18: 160, t13: 500}
};

const scaRiskData: Record<number, number> = {23: 6, 28: 6, 33: 7.8, 38: 11, 39: 11.2};
const conditions: Record<string, string> = {t21: "CONDITION_T21", t18: "CONDITION_T18", t13: "CONDITION_T13", sca: "CONDITION_SCA"};

function interpolate(age: number, data: Record<number, number | Record<string, number>>): number | Record<string, number> {
  const ages = Object.keys(data).map(Number);
  const [lowerAge, upperAge] = [Math.max(...ages.filter(a => a <= age)), Math.min(...ages.filter(a => a >= age))];
  if (lowerAge === upperAge) return data[lowerAge];
  if (!lowerAge) return data[upperAge];
  if (!upperAge) return data[lowerAge];
  const ratio = (age - lowerAge) / (upperAge - lowerAge);
  if (typeof data[lowerAge] === 'object' && typeof data[upperAge] === 'object') {
    return Object.fromEntries(
      Object.entries(data[lowerAge] as Record<string, number>).map(([key, value]) => 
        [key, Math.round(value + ((data[upperAge] as Record<string, number>)[key] - value) * ratio)]
      )
    );
  }
  return (data[lowerAge] as number) + ((data[upperAge] as number) - (data[lowerAge] as number)) * ratio;
}

interface FormData {
  age: string;
  sensitivity: string;
  specificity: string;
  result: string;
  condition: string;
}

interface RiskVisualizerProps {
  risk: number;
  label: string;
  color: string;
}

const RiskVisualizer: React.FC<RiskVisualizerProps> = ({ risk, label, color }) => (
  <div className="mt-2">
    <p className="font-medium">
      {label}: {Math.min(Math.round(risk * 1000), 1000)} RISK_DENOMINATOR ({(risk * 100).toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}%)
    </p>
    <div className="flex flex-wrap max-w-[300px] bg-gray-200 p-1">
      {Array.from({length:1000}, (_, i) => (
        <span key={i} className={`w-1 h-1 m-px ${i < Math.round(risk * 1000) ? color : 'bg-gray-300'}`} />
      ))}
    </div>
  </div>
);

const NIPTResultInterpreter: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    age: '',
    sensitivity: '99',
    specificity: '99.9',
    result: '',
    condition: ''
  });
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');
  const [ultrasoundNormal, setUltrasoundNormal] = useState(false);

  const prevalence = useMemo(() => {
    if (!formData.age) return 0;
    const age = parseInt(formData.age);
    if (formData.result === 'low') {
      const risk = interpolate(age, baseRiskData) as Record<string, number>;
      return (1 / risk.t21 + 1 / risk.t18 + 1 / risk.t13);
    } else if (formData.condition === 'sca') {
      return (interpolate(age, scaRiskData) as number) / 1000;
    } else if (formData.condition) {
      const risk = interpolate(age, baseRiskData) as Record<string, number>;
      return 1 / risk[formData.condition];
    }
    return 0;
  }, [formData.age, formData.result, formData.condition]);

  const { ppv, npv, falseNegativeRate, sens, spec } = useMemo(() => {
    const sens = parseFloat(formData.sensitivity) / 100;
    const spec = parseFloat(formData.specificity) / 100;
    const ppv = (sens * prevalence) / (sens * prevalence + (1 - spec) * (1 - prevalence));
    const npv = (spec * (1 - prevalence)) / ((1 - sens) * prevalence + spec * (1 - prevalence));
    const falseNegativeRate = (1 - sens) * prevalence;
    return { ppv, npv, falseNegativeRate, sens, spec };
  }, [formData.sensitivity, formData.specificity, prevalence]);

  const handleInputChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({...prev, [field]: e.target.value}));
  };

  const calculateRisk = () => {
    if (!formData.age || !formData.result || (formData.result !== 'low' && !formData.condition) || !ultrasoundNormal) {
      setError("ERROR_MESSAGE");
      return;
    }
    setShowResults(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-center mb-4">
        <Image src="/api/placeholder/200/100" alt="CMG Logo" width={200} height={100} />
      </div>

      <Card>
        <CardHeader><h1 className="text-2xl font-bold">TITLE</h1></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="age" className="block text-sm font-medium">LABEL_AGE</label>
              <Select onValueChange={(value) => setFormData(prev => ({...prev, age: value}))}>
                <SelectTrigger><SelectValue placeholder="SELECT_AGE" /></SelectTrigger>
                <SelectContent>
                  {Array.from({length:21}, (_, i) => (
                    <SelectItem key={i+20} value={(i+20).toString()}>{i+20}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(['sensitivity', 'specificity'] as const).map(field => (
              <div key={field}>
                <label htmlFor={field} className="block text-sm font-medium">
                  {field === 'sensitivity' ? 'LABEL_SENSITIVITY' : 'LABEL_SPECIFICITY'}
                </label>
                <Input 
                  type="number" 
                  id={field} 
                  value={formData[field]} 
                  onChange={handleInputChange(field)} 
                  placeholder={`${formData[field]} (DEFAULT_VALUE)`}
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  INSTRUCTION_DEFAULT_VALUE {formData[field]}%
                </p>
              </div>
            ))}
            <div>
              <label htmlFor="result" className="block text-sm font-medium">LABEL_RESULT</label>
              <Select onValueChange={(value: string) => setFormData(prev => ({...prev, result: value, condition: ''}))}>
                <SelectTrigger><SelectValue placeholder="SELECT_RESULT" /></SelectTrigger>
                <SelectContent>
                  {['low', 'high', 'suspicious'].map(value => (
                    <SelectItem key={value} value={value}>{`RESULT_${value.toUpperCase()}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(formData.result === 'high' || formData.result === 'suspicious') && (
              <div>
                <label htmlFor="condition" className="block text-sm font-medium">LABEL_CONDITION</label>
                <Select onValueChange={(value: string) => setFormData(prev => ({...prev, condition: value}))}>
                  <SelectTrigger><SelectValue placeholder="SELECT_CONDITION" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(conditions)
                      .filter(([key]) => formData.result === 'high' ? key !== 'sca' : key === 'sca')
                      .map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="ultrasoundNormal" 
                checked={ultrasoundNormal}
                onCheckedChange={(checked: boolean) => setUltrasoundNormal(checked)}
              />
              <label
                htmlFor="ultrasoundNormal"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                LABEL_ULTRASOUND_NORMAL
              </label>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={calculateRisk} className="w-full">BUTTON_CALCULATE</Button>
        </CardFooter>
      </Card>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {showResults && (
        <Card>
          <CardHeader><h2 className="text-xl font-semibold">TITLE_RESULTS</h2></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.result === 'low' ? (
                <>
                  <p className="font-medium">NPV (Negative Predictive Value): {(npv * 100).toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}%</p>
                  <RiskVisualizer risk={falseNegativeRate} label="LABEL_FALSE_NEGATIVE" color="bg-red-500" />
                  <div className="mt-2">
                    <p className="font-medium">LABEL_SEX_MISMATCH: 5 RISK_DENOMINATOR (5%)</p>
                    <div className="flex flex-wrap max-w-[300px] bg-gray-200 p-1">
                      {Array.from({length:100}, (_, i) => (
                        <span key={i} className={`w-2 h-2 m-px ${i < 5 ? 'bg-red-500' : 'bg-blue-500'}`} />
                      ))}
                    </div>
                    <p className="text-sm mt-1">INSTRUCTION_SEX_MISMATCH</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-medium">PPV_THAI_TEXT {conditions[formData.condition]}: {(ppv * 100).toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}%</p>
                  <p className="mt-2">INCIDENCE_THAI_TEXT: {(prevalence * 100).toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}%</p>
                  <p className="mt-2">PPV_VS_AMNIOCENTESIS {((ppv * 100) / 0.75).toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})} TIMES_HIGHER</p>
                  <RiskVisualizer risk={prevalence} label="INCIDENCE_THAI_TEXT" color="bg-yellow-500" />
                  <RiskVisualizer risk={ppv} label="PPV_THAI_TEXT" color="bg-red-500" />
                  <RiskVisualizer risk={0.0075} label="LABEL_AMNIOCENTESIS_RISK" color="bg-blue-500" />
                </>
              )}
              
              <div>
                <h3 className="font-semibold">TITLE_VARIABLES:</h3>
                <p>Prevalence (P): {prevalence.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}</p>
                <p>Sensitivity (Sens): {sens.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}</p>
                <p>Specificity (Spec): {spec.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">{formData.result === 'low' ? 'TITLE_NPV_CALCULATION:' : 'TITLE_PPV_CALCULATION:'}</h3>
                <p>{formData.result === 'low' ? 'NPV' : 'PPV'} = {formData.result === 'low' 
                  ? `(Spec * (1 - P)) / ((1 - Sens) * P + Spec * (1 - P))`
                  : `(Sens * P) / (Sens * P + (1 - Spec) * (1 - P))`}</p>
                <p>= {formData.result === 'low'
                                  ? `(${spec.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})} * (1 - ${prevalence.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})})) / ((1 - ${sens.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}) * ${prevalence.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})} + ${spec.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})} * (1 - ${prevalence.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}))`
                                  : `(${sens.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})} * ${prevalence.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}) / (${sens.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})} * ${prevalence.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})} + (1 - ${spec.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}) * (1 - ${prevalence.toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}))`}</p>
                                <p>= {(formData.result === 'low' ? npv : ppv).toLocaleString('fullwide', {useGrouping:false,maximumFractionDigits:20})}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardHeader><h2 className="text-xl font-semibold text-red-600">TITLE_WARNING</h2></CardHeader>
                        <CardContent>
                          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                            <p>WARNING_TH_TEXT</p>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="text-center text-sm text-gray-500 mt-4">
                        CREDIT_INFORMATION
                      </div>
                    </div>
                  );
                };

                export default NIPTResultInterpreter;