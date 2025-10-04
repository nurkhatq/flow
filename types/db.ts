import { Task, Template } from './index';

export interface Database {
  tasks: {
    findMany: (params?: { orderBy?: { [key: string]: string } }) => Promise<Task[]>;
    create: (params: { data: any }) => Promise<Task>;
    update: (params: { where: { id: string }, data: any }) => Promise<Task>;
    delete: (params: { where: { id: string } }) => Promise<void>;
  };
  templates: {
    findMany: () => Promise<Template[]>;
    create: (params: { data: any }) => Promise<Template>;
    update: (params: { where: { id: string }, data: any }) => Promise<Template>;
    delete: (params: { where: { id: string } }) => Promise<void>;
  };
}
