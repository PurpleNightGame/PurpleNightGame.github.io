import { useState, useEffect } from 'react';
import { Table, Card, Statistic, Row, Col, Avatar, Progress, Spin } from 'antd';
import { TrophyOutlined, RiseOutlined, TeamOutlined } from '@ant-design/icons';
import { memberService } from '../utils/leancloud';
import { Member } from '../types';
import dayjs from 'dayjs';

const ContributionRanking = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取所有成员
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await memberService.getAllMembers();
      const formattedMembers = result.map((item: any) => ({
        id: item.id,
        name: item.get('name'),
        realName: item.get('realName'),
        level: item.get('level'),
        role: item.get('role'),
        joinDate: new Date(item.get('joinDate')),
        status: item.get('status'),
        contribution: item.get('contribution'),
        contact: item.get('contact'),
        notes: item.get('notes'),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));
      // 按贡献度排序
      formattedMembers.sort((a, b) => b.contribution - a.contribution);
      setMembers(formattedMembers);
    } catch (error: any) {
      console.error('获取成员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // 计算总贡献度
  const totalContribution = members.reduce((sum, member) => sum + member.contribution, 0);
  
  // 计算平均贡献度
  const avgContribution = members.length > 0 ? Math.round(totalContribution / members.length) : 0;

  // 表格列定义
  const columns = [
    {
      title: '排名',
      key: 'ranking',
      render: (_: any, __: any, index: number) => {
        const rankingIcons = [
          <TrophyOutlined key="1" style={{ color: '#FFD700', fontSize: '20px' }} />,
          <TrophyOutlined key="2" style={{ color: '#C0C0C0', fontSize: '18px' }} />,
          <TrophyOutlined key="3" style={{ color: '#CD7F32', fontSize: '16px' }} />
        ];
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {index < 3 ? rankingIcons[index] : null}
            <span style={{ marginLeft: index < 3 ? 8 : 0 }}>{index + 1}</span>
          </div>
        );
      },
    },
    {
      title: '角色名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar style={{ backgroundColor: '#722ed1', marginRight: 8 }}>{text.charAt(0)}</Avatar>
          {text}
        </div>
      )
    },
    {
      title: '职业',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
    },
    {
      title: '加入时间',
      dataIndex: 'joinDate',
      key: 'joinDate',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '贡献度',
      dataIndex: 'contribution',
      key: 'contribution',
      render: (contribution: number) => (
        <div>
          <span style={{ fontWeight: 'bold', marginRight: 8 }}>{contribution}</span>
          <Progress 
            percent={totalContribution ? Math.round((contribution / totalContribution) * 100) : 0} 
            size="small" 
            showInfo={false} 
            strokeColor="#722ed1"
          />
        </div>
      ),
      sorter: (a: Member, b: Member) => b.contribution - a.contribution,
      defaultSortOrder: 'descend'
    },
  ];

  return (
    <div>
      <h2>贡献排行榜</h2>
      
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic 
              title="总贡献度" 
              value={totalContribution} 
              prefix={<TrophyOutlined />} 
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="平均贡献度" 
              value={avgContribution} 
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="成员数量" 
              value={members.length} 
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Table 
          columns={columns} 
          dataSource={members} 
          rowKey="id" 
          pagination={{ pageSize: 10 }}
        />
      </Spin>
    </div>
  );
};

export default ContributionRanking;